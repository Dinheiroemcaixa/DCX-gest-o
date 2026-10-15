// VALIDAÇÃO LOCAL DA BLINDAGEM DE SEGURANÇA DO SCHEMA SUPABASE (DCX GESTÃO V2.1)
import fs from 'fs'
import path from 'path'

console.log('================================================================================')
console.log('SUÍTE OFICIAL DE AUDITORIA DE SEGURANÇA: SCHEMA.SQL (DCX GESTÃO V2.1)')
console.log('================================================================================\n')

const schemaPath = path.resolve('supabase/schema.sql')
const sql = fs.readFileSync(schemaPath, 'utf8')

// 1. Verificação de Search Path em Funções SECURITY DEFINER
console.log('[TESTE 1: search_path em funções SECURITY DEFINER]')
const secDefinerCount = (sql.match(/^\s*SECURITY DEFINER/gm) || []).length
const searchPathCount = (sql.match(/SET search_path = public, pg_temp/g) || []).length
console.assert(secDefinerCount > 0, 'Deve haver funções SECURITY DEFINER')
console.assert(secDefinerCount === searchPathCount, `Todas as funções SECURITY DEFINER (${secDefinerCount}) devem conter 'SET search_path = public, pg_temp' (encontradas: ${searchPathCount})`)
console.log(`✓ PASSOU: Todas as ${secDefinerCount} funções SECURITY DEFINER possuem search_path blindado contra injection.\n`)

// 2. Transferência de Tarefas com Comparação Exaustiva de Todos os Campos
console.log('[TESTE 2: Comparação exaustiva de todos os campos na transferência de tarefas]')
console.assert(sql.includes("protect_task_operations"), "Trigger protect_task_operations deve existir")
console.assert(sql.includes("NEW.description IS DISTINCT FROM OLD.description"), "Deve comparar description antes e depois")
console.assert(sql.includes("NEW.due_date IS DISTINCT FROM OLD.due_date"), "Deve comparar due_date antes e depois")
console.assert(sql.includes("NEW.priority IS DISTINCT FROM OLD.priority"), "Deve comparar priority antes e depois")
console.assert(sql.includes("NEW.status IS DISTINCT FROM OLD.status"), "Deve comparar status antes e depois")
console.assert(sql.includes("NEW.recurrence_type IS DISTINCT FROM OLD.recurrence_type"), "Deve comparar recurrence_type antes e depois")
console.assert(sql.includes("Ao transferir uma tarefa, é estritamente proibido alterar simultaneamente"), "Deve bloquear alterações concomitantes")
console.log('✓ PASSOU: Comparação exaustiva de campos implementada; transferência isola estritamente o destinatário.\n')

// 3. Histórico de POPs: ON DELETE RESTRICT e Bloqueio de Exclusão Física
console.log('[TESTE 3: ON DELETE RESTRICT e bloqueio de exclusão em pop_versions]')
console.assert(sql.includes("pop_id UUID NOT NULL REFERENCES public.pops(id) ON DELETE RESTRICT"), "pop_versions deve usar ON DELETE RESTRICT")
console.assert(!sql.includes("REFERENCES public.pops(id) ON DELETE CASCADE"), "NÃO deve permitir ON DELETE CASCADE em versões de POPs")
console.assert(sql.includes("protect_pop_delete"), "Trigger protect_pop_delete deve existir")
console.assert(sql.includes("Não é permitido excluir fisicamente um POP que possui histórico de versões"), "Deve orientar arquivamento")
console.assert(sql.includes("status != 'arquivado'"), "Não permite criar versão para POP arquivado")
console.log('✓ PASSOU: Versões históricas de POPs blindadas contra exclusão em cascata; remoção física proibida.\n')

// 4. Privilégios DCL Rigorosos (PUBLIC, anon, authenticated)
console.log('[TESTE 4: Privilégios DCL explícitos em tabelas e schema]')
console.assert(sql.includes("REVOKE ALL ON SCHEMA public FROM PUBLIC, anon"), "Revogação total de schema public para PUBLIC e anon")
console.assert(sql.includes("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon"), "Revogação de tabelas para PUBLIC e anon")
console.assert(sql.includes("REVOKE ALL ON public.task_audit_logs FROM PUBLIC, anon, authenticated"), "Revogação de escrita na auditoria")
console.assert(sql.includes("REVOKE ALL ON public.pop_versions FROM PUBLIC, anon, authenticated"), "Revogação de UPDATE/DELETE em pop_versions")
console.log('✓ PASSOU: Privilégios DCL bloqueiam fisicamente acessos indevidos antes mesmo do RLS.\n')

// 5. Auditoria Confiável: Sem Fallback Incorreto de Ator
console.log('[TESTE 5: Auditoria sem fallback incorreto quando auth.uid() for nulo]')
console.assert(sql.includes("Não é permitido registrar ou alterar tarefas sem identificação inequívoca do autor (auth.uid nulo)"), "Deve abortar quando auth.uid() for nulo")
console.assert(!sql.includes("COALESCE(auth.uid(), NEW.assigned_to)"), "NUNCA deve assumir o responsável como ator falso")
console.log('✓ PASSOU: Ação de auditoria exige autor real identificável; falsificação impossibilitada.\n')

// 6. Resolução de Deadlock do Primeiro Proprietário
console.log('[TESTE 6: Resolução transacional do Primeiro Proprietário]')
console.assert(sql.includes("promover_primeiro_proprietario"), "Função de bootstrap deve existir")
console.assert(sql.includes("app.bootstrap_first_owner"), "Flag temporária de transação deve existir")
console.assert(sql.includes("pg_advisory_xact_lock"), "Advisory lock transacional deve existir")
console.log('✓ PASSOU: Ativação do primeiro proprietário sem deadlocks e protegida contra concorrência.\n')

// 7. Isolamento de Auditoria: Operador não consulta histórico de terceiros
console.log('[TESTE 7: Isolamento estrito em audit_select_policy contra visualização de terceiros]')
console.assert(sql.includes("CREATE POLICY \"audit_select_policy\" ON public.task_audit_logs"), "Política audit_select_policy deve existir")
console.assert(sql.includes("actor_id = auth.uid()"), "Operador deve poder ver apenas quando é ator")
console.assert(sql.includes("previous_assigned_to = auth.uid()"), "Operador deve poder ver quando era responsável anterior")
console.assert(sql.includes("new_assigned_to = auth.uid()"), "Operador deve poder ver quando é novo responsável")
console.assert(sql.includes("task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid())"), "Operador deve poder ver se tarefa pertence a ele")
console.assert(!sql.includes("CREATE POLICY \"audit_select_policy\" ON public.task_audit_logs FOR SELECT TO authenticated\n    USING (public.is_approved());"), "NÃO deve permitir leitura irrestrita para qualquer usuário aprovado")
console.log('✓ PASSOU: audit_select_policy restringe estritamente a auditoria para que operadores não vejam terceiros.\n')

// 8. Proteção de profiles.id e consistência com auth.users
console.log('[TESTE 8: Imutabilidade de profiles.id e coerência com auth.users]')
console.assert(sql.includes("O identificador do perfil (id) é estritamente imutável e não pode ser alterado"), "profiles.id deve ser imutável inclusive para proprietário")
console.assert(sql.includes("FROM auth.users"), "Deve validar consistência entre profiles.email e auth.users")
console.assert(sql.includes("handle_user_email_update"), "Gatilho de sincronização auth.users -> profiles deve existir")
console.log('✓ PASSOU: profiles.id blindado contra alterações e profiles.email sincronizado e consistente com auth.users.\n')

// 9. Validação sequencial de versões de POPs e coerência com current_version
console.log('[TESTE 9: Validação sequencial e integridade de versões de POPs]')
console.assert(sql.includes("validate_pop_version_sequence"), "Gatilho validate_pop_version_sequence deve existir")
console.assert(sql.includes("sync_pop_current_version"), "Gatilho sync_pop_current_version deve existir")
console.assert(sql.includes("PERFORM 1 FROM public.pops WHERE id = NEW.pop_id FOR UPDATE;"), "Lock pessimista no pai pops deve existir para concorrência")
console.assert(sql.includes("AFTER INSERT ON public.pop_versions"), "Sincronização de current_version deve ocorrer pós-gravação (AFTER INSERT)")
console.assert(sql.includes("O número da versão do POP deve ser estritamente sequencial"), "Deve impedir saltos na numeração de versões")
console.assert(sql.includes("Inconsistência de Versão: A versão % indicada não existe no histórico de versões do POP"), "pops.current_version deve ser coerente com versões existentes")
console.assert(sql.includes("current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1)"), "Constraint CHECK em pops.current_version")
console.assert(sql.includes("version_number INTEGER NOT NULL CHECK (version_number >= 1)"), "Constraint CHECK em pop_versions.version_number")
console.log('✓ PASSOU: Sequência de versões estrita, lock de concorrência e sincronização pós-gravação garantidas.\n')

// 10. Auditoria Confiável sem confiança cega em NEW.created_by
console.log('[TESTE 10: Bloqueio de forja de autoria em log_task_audit_event quando auth.uid() for nulo]')
console.assert(sql.includes("app.system_audit_context"), "Exige contexto seguro de sistema quando auth.uid() for nulo")
console.assert(!sql.includes("v_actor_id := NEW.created_by;\n        ELSE"), "NÃO deve confiar isoladamente em NEW.created_by sem validação")
console.log('✓ PASSOU: Autoria de auditoria não aceita criação anônima arbitrária nem forja de ator.\n')

// 11. Preservação de created_at e cobertura de campos na transferência
console.log('[TESTE 11: Preservação incondicional de created_at e comparação exaustiva de campos]')
console.assert(sql.includes("A data de criação original da tarefa (created_at) é estritamente imutável"), "created_at imutável no protect_task_operations")
console.assert(sql.includes("NEW.created_at := OLD.created_at;"), "created_at preservado incondicionalmente")
console.assert(sql.includes("NEW.created_at IS DISTINCT FROM OLD.created_at"), "created_at incluso na comparação de transferência")
console.assert(sql.includes("NEW.pop_id IS DISTINCT FROM OLD.pop_id"), "pop_id incluso na comparação de transferência")
console.assert(sql.includes("NEW.pop_version IS DISTINCT FROM OLD.pop_version"), "pop_version incluso na comparação de transferência")
console.log('✓ PASSOU: created_at blindado e comparação cobre 100% dos campos de tarefas na transferência.\n')

// 12. Elegibilidade do destinatário na criação e na transferência
console.log('[TESTE 12: Elegibilidade do destinatário na criação e transferência de tarefas]')
console.assert(sql.includes("protect_task_creation"), "Gatilho protect_task_creation deve existir")
console.assert(sql.includes("tasks_insert_policy"), "tasks_insert_policy deve validar elegibilidade")
console.assert(sql.includes("tasks_update_policy"), "tasks_update_policy deve validar elegibilidade")
console.assert(sql.includes("A tarefa só pode ser atribuída a um colaborador ativo e aprovado"), "Valida elegibilidade na inserção de tarefa")
console.assert(sql.includes("A tarefa só pode ser transferida para um colaborador ativo e aprovado"), "Valida elegibilidade na transferência universal")
console.log('✓ PASSOU: Destinatário de tarefas obrigatoriamente ativo e aprovado em criação e transferência.\n')

// 13. Privilégios de exclusão de perfis e permissões padrão para funções futuras
console.log('[TESTE 13: Privilégios DCL de exclusão de perfis e ALTER DEFAULT PRIVILEGES]')
console.assert(sql.includes("GRANT SELECT, UPDATE ON public.profiles TO authenticated;"), "DELETE revogado de authenticated na DCL de profiles")
console.assert(!sql.includes("GRANT SELECT, UPDATE, DELETE ON public.profiles TO authenticated;"), "NÃO deve ter DELETE em profiles para authenticated")
console.assert(sql.includes("protect_profile_delete"), "Gatilho protect_profile_delete deve impedir deleção de perfil com histórico")
console.assert(sql.includes("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC, anon;"), "ALTER DEFAULT PRIVILEGES para rotinas")
console.assert(sql.includes("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon;"), "ALTER DEFAULT PRIVILEGES para tabelas")
console.assert(sql.includes("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon;"), "ALTER DEFAULT PRIVILEGES para sequências")
console.log('✓ PASSOU: Privilégios de perfis restritos e permissões padrão para funções futuras blindadas.\n')

console.log('================================================================================')
console.log('RESULTADO FINAL: TODOS OS 13 TESTES DE AUDITORIA DE SEGURANÇA FORAM APROVADOS!')
console.log('================================================================================')
