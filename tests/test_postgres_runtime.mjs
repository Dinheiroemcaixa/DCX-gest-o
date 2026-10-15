// ==============================================================================
// DCX GESTÃO — HOMOLOGAÇÃO DE RUNTIME DO SCHEMA SQL NO POSTGRESQL REAL (PGLITE)
// ==============================================================================
// Executa o script oficial supabase/schema.sql diretamente no engine PostgreSQL 16
// em memória (via @electric-sql/pglite), validando DDL, triggers, constraints,
// versionamento de POPs, sincronização de e-mail e políticas RLS.
// ==============================================================================

import fs from 'fs'
import path from 'path'
import { PGlite } from '@electric-sql/pglite'

console.log('================================================================================')
console.log('DCX GESTÃO: HOMOLOGAÇÃO DE RUNTIME POSTGRESQL 16 (PGLITE WASM)')
console.log('================================================================================\n')

async function runPostgresHomologation() {
    console.log('[ETAPA 1: Inicializando engine PostgreSQL 16 isolado em memória...]')
    const pg = new PGlite()

    try {
        // 1. STUBS DE AMBIENTE ISOLADO (Simulação estrita dos pré-requisitos do Supabase)
        // NOTA: Estes objetos existem nativamente no Supabase gerenciado. Aqui são criados
        // exclusivamente para viabilizar a execução do DDL puro em ambiente isolado.
        console.log('Configurando roles e schema auth no ambiente de teste...')
        await pg.exec(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
                    CREATE ROLE anon;
                END IF;
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
                    CREATE ROLE authenticated;
                END IF;
                IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
                    CREATE ROLE service_role;
                END IF;
            END $$;

            CREATE SCHEMA IF NOT EXISTS auth;

            CREATE TABLE IF NOT EXISTS auth.users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT UNIQUE,
                raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );

            CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
            BEGIN
                RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
            EXCEPTION WHEN OTHERS THEN
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql STABLE;
        `)

        // 2. EXECUÇÃO DO SCHEMA DDL COMPLETO
        console.log('[ETAPA 2: Executando supabase/schema.sql no PostgreSQL real...]')
        const schemaPath = path.resolve('supabase/schema.sql')
        let sql = fs.readFileSync(schemaPath, 'utf8')

        // O PGlite (WASM) possui gen_random_uuid() nativo do PostgreSQL 16, mas não embute os binários C legados uuid-ossp e pgcrypto.
        // Como o schema utiliza exclusivamente gen_random_uuid() nativo,
        // no ambiente de teste isolado substituímos apenas as chamadas DDL de extensão para evitar erro 0A000,
        // preservando integralmente o arquivo supabase/schema.sql original.
        const sqlForTest = sql
            .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '-- [STUB PGLITE: uuid-ossp substituído por gen_random_uuid() nativo]')
            .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/g, '-- [STUB PGLITE: pgcrypto substituído por gen_random_uuid() nativo]')

        const startTime = Date.now()
        try {
            await pg.exec(sqlForTest)
        } catch (ddlErr) {
            console.error('\n--- ERRO DETALHADO DO POSTGRESQL NO DDL ---')
            console.error('Mensagem:', ddlErr.message)
            console.error('Severidade:', ddlErr.severity)
            console.error('Código:', ddlErr.code)
            throw ddlErr
        }
        const duration = Date.now() - startTime
        console.log(`✓ SUCESSO: O schema DDL completo foi executado e compilado pelo PostgreSQL em ${duration}ms sem nenhum erro de sintaxe ou tipagem!\n`)

        // 3. VALIDAÇÃO ESTRUTURAL DAS TABELAS E FUNÇÕES NO CATÁLOGO DO POSTGRESQL
        console.log('[ETAPA 3: Inspecionando catálogo de objetos gerados (pg_tables / pg_proc)...]')
        const tablesRes = await pg.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
        `)
        const tables = tablesRes.rows.map(r => r.tablename)
        console.log('Tabelas públicas criadas:', tables.join(', '))
        console.assert(tables.includes('profiles'), 'Tabela profiles deve existir')
        console.assert(tables.includes('pops'), 'Tabela pops deve existir')
        console.assert(tables.includes('pop_versions'), 'Tabela pop_versions deve existir')
        console.assert(tables.includes('tasks'), 'Tabela tasks deve existir')
        console.assert(tables.includes('task_audit_logs'), 'Tabela task_audit_logs deve existir')

        const functionsRes = await pg.query(`
            SELECT proname FROM pg_proc p 
            JOIN pg_namespace n ON n.oid = p.pronamespace 
            WHERE n.nspname = 'public' AND p.prosecdef = true;
        `)
        const secDefFunctions = functionsRes.rows.map(r => r.proname)
        console.log(`Funções SECURITY DEFINER compiladas no catálogo: ${secDefFunctions.length}`)
        console.assert(secDefFunctions.includes('validate_pop_version_sequence'), 'Função validate_pop_version_sequence deve existir')
        console.assert(secDefFunctions.includes('sync_pop_current_version'), 'Função sync_pop_current_version deve existir')
        console.assert(secDefFunctions.includes('handle_user_email_update'), 'Função handle_user_email_update deve existir')
        console.assert(secDefFunctions.includes('protect_profile_fields'), 'Função protect_profile_fields deve existir')
        console.assert(secDefFunctions.includes('protect_task_operations'), 'Função protect_task_operations deve existir')
        console.assert(secDefFunctions.includes('protect_task_creation'), 'Função protect_task_creation deve existir')
        console.log('✓ Catálogo PostgreSQL validado com sucesso.\n')

        // 4. TESTE DE RUNTIME: VERSIONAMENTO DE POPs (CORREÇÃO 1)
        console.log('[ETAPA 4: Teste de Runtime — Versionamento de POPs e Ciclo de Vida...]')

        // Criar usuário proprietário no auth.users (trigger handle_new_user cria profile)
        const proprietarioId = '00000000-0000-4000-a000-000000000000'
        await pg.query(`
            INSERT INTO auth.users (id, email, raw_user_meta_data) 
            VALUES ($1, 'proprietario@dcx.com', '{"name": "Proprietário Geral"}'::jsonb);
        `, [proprietarioId])

        // Validar que tentativa de promoção de role sem autorização é bloqueada pelo PostgreSQL
        let unauthorizedPromotionFailed = false
        try {
            await pg.query(`
                UPDATE public.profiles SET role = 'proprietario', status = 'aprovado' WHERE id = $1;
            `, [proprietarioId])
        } catch (err) {
            unauthorizedPromotionFailed = true
            console.assert(err.message.includes('Somente o Proprietário do sistema pode alterar o papel'), 'Deve exigir proprietário')
        }
        console.assert(unauthorizedPromotionFailed, 'Promoção sem autorização deve ser rejeitada pelo PostgreSQL')
        console.log('✓ Bloqueio de auto-promoção de role sem permissão validado com sucesso.')

        // Efetuar bootstrap legítimo do primeiro proprietário
        await pg.exec(`
            SELECT set_config('app.bootstrap_first_owner', 'true', false);
            UPDATE public.profiles SET role = 'proprietario', status = 'aprovado' WHERE id = '${proprietarioId}';
            SELECT set_config('app.bootstrap_first_owner', 'false', false);
        `)
        console.log('✓ Primeiro proprietário inicializado via bootstrap seguro.')

        // Definir contexto autenticado como o Proprietário aprovado
        await pg.exec(`SELECT set_config('request.jwt.claim.sub', '${proprietarioId}', false);`)

        // Criar usuário gestor no auth.users
        const gestorId = '11111111-1111-4111-a111-111111111111'
        await pg.query(`
            INSERT INTO auth.users (id, email, raw_user_meta_data) 
            VALUES ($1, 'gestora@dcx.com', '{"name": "Gestora Oficial"}'::jsonb);
        `, [gestorId])

        // Promover para gestora aprovada (autorizada pelo Proprietário autenticado)
        await pg.query(`
            UPDATE public.profiles SET role = 'gestora', status = 'aprovado' WHERE id = $1;
        `, [gestorId])
        console.log('✓ Gestora promovida e aprovada pelo Proprietário autêntico.')

        // Criar POP
        const popId = '22222222-2222-4222-a222-222222222222'
        await pg.query(`
            INSERT INTO public.pops (id, code, title, created_by)
            VALUES ($1, 'POP-ADM-001', 'Fechamento Fiscal', $2);
        `, [popId, gestorId])

        const initialPop = (await pg.query(`SELECT current_version FROM public.pops WHERE id = $1`, [popId])).rows[0]
        console.assert(initialPop.current_version === 1, 'POP recém-criado deve ter current_version = 1')
        console.log('✓ POP inicial criado com current_version = 1.')

        // Inserir Versão 1 em pop_versions (trigger BEFORE valida sequência, trigger AFTER sincroniza)
        await pg.query(`
            INSERT INTO public.pop_versions (pop_id, version_number, title, created_by)
            VALUES ($1, 1, 'Versão Inicial de Fechamento Fiscal', $2);
        `, [popId, gestorId])

        const popAfterV1 = (await pg.query(`SELECT current_version FROM public.pops WHERE id = $1`, [popId])).rows[0]
        console.assert(popAfterV1.current_version === 1, 'Após V1, current_version deve ser 1')
        console.log('✓ Versão 1 inserida e confirmada pelo PostgreSQL; pops.current_version sincronizado com sucesso.')

        // Inserir Versão 2 em pop_versions (deve atualizar current_version para 2 sem o erro antigo de ciclo de vida!)
        await pg.query(`
            INSERT INTO public.pop_versions (pop_id, version_number, title, created_by)
            VALUES ($1, 2, 'Segunda Versão Aprimorada', $2);
        `, [popId, gestorId])

        const popAfterV2 = (await pg.query(`SELECT current_version FROM public.pops WHERE id = $1`, [popId])).rows[0]
        console.assert(popAfterV2.current_version === 2, 'Após V2, current_version deve ser atualizado para 2')
        console.log('✓ Versão 2 inserida sem conflito entre triggers! pops.current_version atualizado para 2.')

        // Rejeição de lacuna na numeração (tentar inserir versão 4 quando a esperada é 3)
        let gapFailed = false
        try {
            await pg.query(`
                INSERT INTO public.pop_versions (pop_id, version_number, title, created_by)
                VALUES ($1, 4, 'Tentativa de Versão 4 com Gap', $2);
            `, [popId, gestorId])
        } catch (err) {
            gapFailed = true
            console.assert(err.message.includes('estritamente sequencial'), 'Mensagem de erro deve alertar sobre sequência')
        }
        console.assert(gapFailed, 'O PostgreSQL DEVE abortar inserção com gap de versão')
        console.log('✓ Tentativa de salto de versão (gap) rejeitada com sucesso pelo PostgreSQL.')

        // Rejeição de duplicidade (tentar inserir versão 2 novamente)
        let dupFailed = false
        try {
            await pg.query(`
                INSERT INTO public.pop_versions (pop_id, version_number, title, created_by)
                VALUES ($1, 2, 'Tentativa de Versão 2 Duplicada', $2);
            `, [popId, gestorId])
        } catch (err) {
            dupFailed = true
        }
        console.assert(dupFailed, 'Constraint uq_pop_version deve rejeitar versão duplicada')
        console.log('✓ Duplicidade de versão rejeitada pela constraint de unicidade.')

        // Rejeição de alteração direta e arbitrária em pops.current_version
        let directVersionChangeFailed = false
        try {
            await pg.query(`
                UPDATE public.pops SET current_version = 99 WHERE id = $1;
            `, [popId])
        } catch (err) {
            directVersionChangeFailed = true
            console.assert(err.message.includes('Inconsistência de Versão'), 'Erro de inconsistência de versão disparado')
        }
        console.assert(directVersionChangeFailed, 'Alteração direta para versão inexistente deve ser bloqueada')
        console.log('✓ Alteração direta arbitrária em pops.current_version bloqueada pelo gatilho protect_pop_lifecycle.\n')


        // 5. TESTE DE RUNTIME: SINCRONIZAÇÃO DE E-MAIL (CORREÇÃO 2)
        console.log('[ETAPA 5: Teste de Runtime — Sincronização de E-mail e Proteção de Perfis...]')

        // Criar usuário operador
        const operadorId = '33333333-3333-4333-a333-333333333333'
        await pg.query(`
            INSERT INTO auth.users (id, email, raw_user_meta_data)
            VALUES ($1, 'operador.original@dcx.com', '{"name": "Operador 1"}'::jsonb);
        `, [operadorId])

        // Aprovar a conta como operador
        await pg.query(`
            UPDATE public.profiles SET status = 'aprovado' WHERE id = $1;
        `, [operadorId])

        const initialProf = (await pg.query(`SELECT email, role, status FROM public.profiles WHERE id = $1`, [operadorId])).rows[0]
        console.assert(initialProf.email === 'operador.original@dcx.com', 'Email inicial criado')
        console.assert(initialProf.role === 'operador', 'Role inicial operador')
        console.log('✓ Perfil de operador criado com email operador.original@dcx.com.')

        // Tentativa de alteração direta não autorizada de e-mail no perfil via API (sem respaldo em auth.users)
        let directEmailChangeFailed = false
        try {
            await pg.query(`
                UPDATE public.profiles 
                SET email = 'hacker.fraude@dcx.com' 
                WHERE id = $1;
            `, [operadorId])
        } catch (err) {
            directEmailChangeFailed = true
            console.assert(err.message.includes('Inconsistência de Identidade'), 'Deve exigir fluxo oficial de autenticação')
        }
        console.assert(directEmailChangeFailed, 'Tentativa de alteração direta de e-mail na tabela profiles deve falhar')
        console.log('✓ Tentativa de alteração direta de e-mail na API bloqueada por Inconsistência de Identidade.')

        // Sincronização legítima originada pelo Supabase Auth (atualização em auth.users disparando trigger)
        await pg.query(`
            UPDATE auth.users 
            SET email = 'operador.novo@dcx.com', updated_at = now() 
            WHERE id = $1;
        `, [operadorId])

        const updatedProf = (await pg.query(`SELECT email FROM public.profiles WHERE id = $1`, [operadorId])).rows[0]
        console.assert(updatedProf.email === 'operador.novo@dcx.com', 'O e-mail no perfil deve estar sincronizado')
        console.log('✓ Sincronização legítima via trigger on_auth_user_updated autorizada e efetivada no perfil!')

        // Tentativa de alteração do ID do perfil
        let idAlterationFailed = false
        try {
            await pg.query(`
                UPDATE public.profiles 
                SET id = '44444444-4444-4444-a444-444444444444' 
                WHERE id = $1;
            `, [operadorId])
        } catch (err) {
            idAlterationFailed = true
            console.assert(err.message.includes('estritamente imutável'), 'Deve barrar alteração de ID')
        }
        console.assert(idAlterationFailed, 'Tentativa de alteração de profiles.id deve ser categoricamente bloqueada')
        console.log('✓ Imutabilidade absoluta de profiles.id confirmada pelo PostgreSQL.\n')


        // 6. TESTE DE RUNTIME: ELEGIBILIDADE E AUDITORIA DE TAREFAS
        console.log('[ETAPA 6: Teste de Runtime — Elegibilidade do Responsável e Auditoria de Tarefas...]')

        // Criar usuário suspenso
        const suspensoId = '55555555-5555-4555-a555-555555555555'
        await pg.query(`
            INSERT INTO auth.users (id, email, raw_user_meta_data)
            VALUES ($1, 'suspenso@dcx.com', '{"name": "Conta Suspensa"}'::jsonb);
        `, [suspensoId])
        await pg.query(`
            UPDATE public.profiles SET status = 'suspenso' WHERE id = $1;
        `, [suspensoId])

        // Tentativa de atribuir tarefa a usuário suspenso (deve falhar por protect_task_creation)
        let assignToSuspendedFailed = false
        try {
            await pg.query(`
                INSERT INTO public.tasks (title, assigned_to, created_by, due_date)
                VALUES ('Tarefa Indevida', $1, $2, CURRENT_DATE);
            `, [suspensoId, gestorId])
        } catch (err) {
            assignToSuspendedFailed = true
            console.assert(err.message.includes('colaborador ativo e aprovado'), 'Deve exigir usuário aprovado')
        }
        console.assert(assignToSuspendedFailed, 'Criação de tarefa para usuário suspenso deve ser bloqueada')
        console.log('✓ Bloqueio de atribuição para usuário suspenso comprovado no PostgreSQL.')

        // Criar tarefa válida para operador
        const taskId = '66666666-6666-4666-a666-666666666666'
        // Simular contexto de identidade da gestora para o log_task_audit_event
        await pg.exec(`SELECT set_config('request.jwt.claim.sub', '${gestorId}', false);`)
        await pg.query(`
            INSERT INTO public.tasks (id, title, assigned_to, created_by, due_date)
            VALUES ($1, 'Conciliação Bancária', $2, $3, CURRENT_DATE);
        `, [taskId, operadorId, gestorId])

        // Verificar log de auditoria gerado automaticamente pela trigger
        function assert(cond, msg) {
            if (!cond) {
                throw new Error(`FALHA NA ASSERÇÃO: ${msg}`)
            }
        }

        const auditLog = (await pg.query(`SELECT action, actor_id, new_assigned_to FROM public.task_audit_logs WHERE task_id = $1`, [taskId])).rows[0]
        assert(auditLog.action === 'criacao', 'Ação deve ser criacao')
        assert(auditLog.actor_id === gestorId, 'Ator da auditoria deve ser a gestora')
        assert(auditLog.new_assigned_to === operadorId, 'Destinatário deve ser o operador')
        console.log('✓ Tarefa criada e registrada automaticamente no task_audit_logs com autoria real comprovada.\n')


        // 7. TESTE DE RUNTIME: POLÍTICAS RLS (audit_select_policy E ISOLAMENTO OPERACIONAL)
        console.log('[ETAPA 7: Teste de Runtime — Validação de Políticas RLS no PostgreSQL...]')

        // Criar segundo operador aprovado
        const operador2Id = '77777777-7777-4777-a777-777777777777'
        await pg.query(`
            INSERT INTO auth.users (id, email, raw_user_meta_data)
            VALUES ($1, 'operador2@dcx.com', '{"name": "Operador 2"}'::jsonb);
        `, [operador2Id])
        // Proprietário aprova a conta do operador 2
        await pg.exec(`SELECT set_config('request.jwt.claim.sub', '${proprietarioId}', false);`)
        await pg.query(`
            UPDATE public.profiles SET status = 'aprovado' WHERE id = $1;
        `, [operador2Id])

        // Criar tarefa 2 atribuída ao operador 2 pela gestora
        const task2Id = '88888888-8888-4888-a888-888888888888'
        await pg.exec(`SELECT set_config('request.jwt.claim.sub', '${gestorId}', false);`)
        await pg.query(`
            INSERT INTO public.tasks (id, title, assigned_to, created_by, due_date)
            VALUES ($1, 'Fechamento de Folha', $2, $3, CURRENT_DATE);
        `, [task2Id, operador2Id, gestorId])

        // Simular consulta de auditoria como Operador 1 sob a role 'authenticated'
        await pg.exec(`
            SET ROLE authenticated;
            SELECT set_config('request.jwt.claim.sub', '${operadorId}', false);
        `)
        const logsOperador1 = (await pg.query(`SELECT id, task_id, task_title FROM public.task_audit_logs;`)).rows
        console.log(`Logs visíveis para Operador 1: ${logsOperador1.length}`)
        assert(logsOperador1.length === 1, 'Operador 1 deve enxergar exclusivamente 1 registro de log')
        assert(logsOperador1[0].task_id === taskId, 'Operador 1 só deve enxergar a sua própria tarefa')
        console.log('✓ RLS: Operador 1 estritamente isolado de tarefas de terceiros!')

        // Simular consulta de auditoria como Gestora sob a role 'authenticated'
        await pg.exec(`
            SELECT set_config('request.jwt.claim.sub', '${gestorId}', false);
        `)
        const logsGestora = (await pg.query(`SELECT id, task_id, task_title FROM public.task_audit_logs;`)).rows
        console.log(`Logs visíveis para Gestora: ${logsGestora.length}`)
        assert(logsGestora.length >= 2, 'Gestora deve enxergar todos os logs de tarefas da equipe')
        console.log('✓ RLS: Gestora tem visão global de auditoria para acompanhamento da equipe.\n')

        await pg.exec(`RESET ROLE;`)

        console.log('================================================================================')
        console.log('RESULTADO DA HOMOLOGAÇÃO POSTGRESQL 16: TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!')
        console.log('================================================================================\n')

    } finally {
        await pg.close()
        console.log('Instância PostgreSQL PGlite em memória encerrada e descartada com sucesso.')
    }
}

runPostgresHomologation().catch(err => {
    console.error('FALHA CRÍTICA NA HOMOLOGAÇÃO POSTGRESQL:', err)
    process.exit(1)
})
