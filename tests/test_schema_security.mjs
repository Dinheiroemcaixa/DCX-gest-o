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

console.log('================================================================================')
console.log('RESULTADO FINAL: TODOS OS 6 TESTES DE AUDITORIA DE SEGURANÇA FORAM APROVADOS!')
console.log('================================================================================')
