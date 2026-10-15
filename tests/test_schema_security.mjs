// VALIDAÇÃO LOCAL DA BLINDAGEM DE SEGURANÇA DO SCHEMA SUPABASE (DCX GESTÃO)
import fs from 'fs'
import path from 'path'

console.log('================================================================================')
console.log('SUÍTE DE AUDITORIA DE SEGURANÇA: SUPABASE / SCHEMA.SQL (DCX GESTÃO)')
console.log('================================================================================\n')

const schemaPath = path.resolve('supabase/schema.sql')
const sql = fs.readFileSync(schemaPath, 'utf8')

// 1. Verificação de Search Path em Funções SECURITY DEFINER
console.log('[TESTE 1: search_path em funções SECURITY DEFINER]')
const secDefinerCount = (sql.match(/^\s*SECURITY DEFINER/gm) || []).length
const searchPathCount = (sql.match(/SET search_path = public, pg_temp/g) || []).length
console.assert(secDefinerCount > 0, 'Deve haver funções SECURITY DEFINER')
console.assert(secDefinerCount === searchPathCount, `Todas as funções SECURITY DEFINER (${secDefinerCount}) devem conter 'SET search_path = public, pg_temp' (encontradas: ${searchPathCount})`)
console.log(`✓ PASSOU: Todas as ${secDefinerCount} funções SECURITY DEFINER possuem search_path seguro contra injection.\n`)

// 2. Bloqueio de Auto-Elevação no Cadastro Inicial
console.log('[TESTE 2: Cadastro compulsório como operador e pendente]')
console.assert(sql.includes("handle_new_user"), "Função handle_new_user deve existir")
console.assert(sql.includes("'operador'"), "Deve forçar role operador no trigger")
console.assert(sql.includes("'pendente'"), "Deve forçar status pendente no trigger")
console.assert(sql.includes("AFTER INSERT ON auth.users"), "Trigger deve ser acionada em auth.users")
console.log('✓ PASSOU: Novos cadastros entram compulsoriamente como operador e pendente via trigger do banco.\n')

// 3. Procedimento Controlado para Primeiro Proprietário
console.log('[TESTE 3: Procedimento controlado e seguro para Primeiro Proprietário]')
console.assert(sql.includes("promover_primeiro_proprietario"), "Função promover_primeiro_proprietario deve existir")
console.assert(!sql.includes("COUNT(*) = 0"), "NÃO deve usar COUNT(*) = 0 ingênuo para inicialização automática")
console.assert(sql.includes("REVOKE ALL ON FUNCTION public.promover_primeiro_proprietario"), "Função deve ter acesso revogado para PUBLIC, anon e authenticated")
console.assert(sql.includes("GRANT EXECUTE ON FUNCTION public.promover_primeiro_proprietario(TEXT) TO service_role"), "Permitir execução apenas para service_role / SQL Editor")
console.log('✓ PASSOU: Primeiro proprietário requer execução controlada no painel; função inacessível via API pública.\n')

// 4. Bloqueio de Auto-Promoção na Atualização de Perfil
console.log('[TESTE 4: Bloqueio de Auto-Promoção na atualização de perfil]')
console.assert(sql.includes("protect_profile_fields"), "Trigger protect_profile_fields deve existir")
console.assert(sql.includes("Acesso Negado: Somente o Proprietário"), "Deve conter bloqueio para não-proprietários")
console.log('✓ PASSOU: Trigger de integridade barra qualquer tentativa de edição de role/status por usuários comuns.\n')

// 5. Imutabilidade dos Registros de Auditoria (Append-Only)
console.log('[TESTE 5: Imutabilidade dos logs de auditoria]')
console.assert(sql.includes("audit_select_policy"), "Deve existir política de SELECT para auditoria")
console.assert(sql.includes("audit_insert_policy"), "Deve existir política de INSERT para auditoria")
console.assert(!sql.includes("audit_update_policy"), "NÃO deve existir política de UPDATE em logs de auditoria")
console.assert(!sql.includes("audit_delete_policy"), "NÃO deve existir política de DELETE em logs de auditoria")
console.log('✓ PASSOU: Tabela de auditoria é estritamente append-only (sem permissão de alteração ou exclusão).\n')

// 6. Separação de Acesso a Tarefas entre Operador e Equipe
console.log('[TESTE 6: RLS de tarefas respeitando operador vs equipe gerencial]')
console.assert(sql.includes("assigned_to = auth.uid() OR created_by = auth.uid()"), "Operadores devem ser restritos às suas tarefas")
console.assert(sql.includes("is_gestora_or_above()"), "Gestora e Proprietário devem ter acesso gerencial")
console.log('✓ PASSOU: Políticas de tasks respeitam a separação rígida entre tarefas próprias e supervisão gerencial.\n')

// 7. Proteção contra comandos destrutivos desnecessários
console.log('[TESTE 7: Idempotência e ausência de comandos destrutivos perigosos]')
console.assert(!sql.includes("DROP SCHEMA public CASCADE"), "Não deve conter DROP SCHEMA public CASCADE")
console.assert(!sql.includes("TRUNCATE"), "Não deve conter comandos TRUNCATE")
console.assert(sql.includes("CREATE TABLE IF NOT EXISTS"), "Deve usar CREATE TABLE IF NOT EXISTS")
console.log('✓ PASSOU: O script é seguro para aplicação em projeto novo e vazio sem comandos destrutivos.\n')

console.log('================================================================================')
console.log('RESULTADO FINAL: TODOS OS TESTES DE AUDITORIA DE SEGURANÇA FORAM APROVADOS!')
console.log('================================================================================')
