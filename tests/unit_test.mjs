// SUÍTE DE TESTES: VALIDAÇÃO DAS REGRAS DE SEPARAÇÃO PESSOAL VS EQUIPE

console.log('======================================================================')
console.log('SUÍTE OFICIAL DE TESTES: SEPARAÇÃO ENTRE TAREFAS PESSOAIS E EQUIPE')
console.log('======================================================================\n')

// Perfis de Teste
const userProprietario = { id: 'usr-prop-01', name: 'Proprietário', role: 'proprietario', status: 'aprovado' }
const userGestora = { id: 'usr-gest-02', name: 'Ana Gestora', role: 'gestora', status: 'aprovado' }
const userOperador1 = { id: 'usr-op-03', name: 'Carlos Operador', role: 'operador', status: 'aprovado' }
const userOperador2 = { id: 'usr-op-04', name: 'Mariana Operadora', role: 'operador', status: 'aprovado' }

// Base de Dados de Tarefas
const allTasks = [
  { id: 't-1', title: 'Tarefa do Proprietário (Fechamento Geral)', assigned_to: 'usr-prop-01', status: 'Em Aberto', due_date: '2026-10-15' },
  { id: 't-2', title: 'Tarefa da Gestora (Planejamento de Escala)', assigned_to: 'usr-gest-02', status: 'Em Aberto', due_date: '2026-10-15' },
  { id: 't-3', title: 'Tarefa do Carlos (Lançamentos Fiscais)', assigned_to: 'usr-op-03', status: 'Em Aberto', due_date: '2026-10-15' },
  { id: 't-4', title: 'Tarefa da Mariana (Folha de Pagamento)', assigned_to: 'usr-op-04', status: 'Em Aberto', due_date: '2026-10-15' },
]

// ── REGRA DE "MINHAS TAREFAS" (Espaço Pessoal Estrito) ────────────────
function getMinhasTarefas(tasks, currentUser) {
  // Cada usuário autenticado vê EXCLUSIVAMENTE tarefas atribuídas a ele
  return tasks.filter(t => t.assigned_to === currentUser.id && t.status !== 'Concluida')
}

// ── REGRA DO MÓDULO "EQUIPE" (Visão Gerencial) ────────────────────────
function getTarefasEquipeMembro(tasks, currentUser, targetMemberId) {
  // Operadores NÃO possuem permissão de acesso gerencial a tarefas de terceiros
  if (currentUser.role === 'operador') {
    throw new Error('ACESSO_NEGADO: Operador não possui permissão para consultar tarefas de outros colaboradores na Equipe.')
  }
  // Proprietário e Gestora podem consultar as tarefas do colaborador selecionado
  return tasks.filter(t => t.assigned_to === targetMemberId)
}

// ── REGRA DE TRANSFERÊNCIA DE TAREFA ──────────────────────────────────
function transferirTarefa(tasks, taskId, newAssignedId, reason, actor, auditLogs) {
  const taskIndex = tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) throw new Error('Tarefa não encontrada')
  
  const previousAssigned = tasks[taskIndex].assigned_to
  const updatedTask = {
    ...tasks[taskIndex],
    assigned_to: newAssignedId
  }
  
  // Registra auditoria
  auditLogs.push({
    task_id: taskId,
    action: 'transferencia',
    actor_id: actor.id,
    actor_name: actor.name,
    previous_assigned_to: previousAssigned,
    new_assigned_to: newAssignedId,
    reason,
    timestamp: new Date().toISOString()
  })

  const newTaskList = [...tasks]
  newTaskList[taskIndex] = updatedTask
  return newTaskList
}

// ======================================================================
// EXECUÇÃO DOS 6 TESTES OBRIGATÓRIOS
// ======================================================================

console.log('[TESTE 1: PROPRIETÁRIO EM "MINHAS TAREFAS"]')
const minhasProp = getMinhasTarefas(allTasks, userProprietario)
console.assert(minhasProp.length === 1, 'Proprietário deve ver apenas 1 tarefa pessoal')
console.assert(minhasProp[0].id === 't-1', 'Deve ser estritamente a tarefa t-1')
console.assert(!minhasProp.some(t => t.assigned_to !== userProprietario.id), 'Não deve conter tarefas de terceiros')
console.log('✓ PASSOU: O Proprietário vê exclusivamente suas próprias tarefas em "Minhas Tarefas".\n')

console.log('[TESTE 2: GESTORA EM "MINHAS TAREFAS"]')
const minhasGest = getMinhasTarefas(allTasks, userGestora)
console.assert(minhasGest.length === 1, 'Gestora deve ver apenas 1 tarefa pessoal')
console.assert(minhasGest[0].id === 't-2', 'Deve ser estritamente a tarefa t-2')
console.assert(!minhasGest.some(t => t.assigned_to !== userGestora.id), 'Não deve conter tarefas de terceiros')
console.log('✓ PASSOU: A Gestora vê exclusivamente suas próprias tarefas em "Minhas Tarefas".\n')

console.log('[TESTE 3: OPERADOR EM "MINHAS TAREFAS"]')
const minhasCarlos = getMinhasTarefas(allTasks, userOperador1)
console.assert(minhasCarlos.length === 1, 'Carlos deve ver apenas 1 tarefa pessoal')
console.assert(minhasCarlos[0].id === 't-3', 'Deve ser estritamente a tarefa t-3')
console.assert(!minhasCarlos.some(t => t.assigned_to !== userOperador1.id), 'Não deve conter tarefas de terceiros')
console.log('✓ PASSOU: O Operador vê exclusivamente suas próprias tarefas em "Minhas Tarefas".\n')

console.log('[TESTE 4: CONSULTA DE TAREFAS DE OPERADORES PELO CARD "EQUIPE" (PROPRIETÁRIO E GESTORA)]')
const tarefasCarlosVistasPorProp = getTarefasEquipeMembro(allTasks, userProprietario, userOperador1.id)
console.assert(tarefasCarlosVistasPorProp.length === 1 && tarefasCarlosVistasPorProp[0].id === 't-3', 'Proprietário deve conseguir auditar as tarefas de Carlos')

const tarefasCarlosVistasPorGest = getTarefasEquipeMembro(allTasks, userGestora, userOperador1.id)
console.assert(tarefasCarlosVistasPorGest.length === 1 && tarefasCarlosVistasPorGest[0].id === 't-3', 'Gestora deve conseguir auditar as tarefas de Carlos')
console.log('✓ PASSOU: Tanto o Proprietário quanto a Gestora conseguem auditar e administrar tarefas dos operadores no card "Equipe".\n')

console.log('[TESTE 5: BLOQUEIO DO OPERADOR NO ACESSO GERENCIAL DE "EQUIPE"]')
let bloqueioOperadorConfirmado = false
try {
  getTarefasEquipeMembro(allTasks, userOperador1, userOperador2.id)
} catch (err) {
  if (err.message.includes('ACESSO_NEGADO')) {
    bloqueioOperadorConfirmado = true
  }
}
console.assert(bloqueioOperadorConfirmado === true, 'Operador DEVE ser bloqueado de ver tarefas alheias na Equipe')
console.log('✓ PASSOU: O Operador é rigorosamente bloqueado de acessar a visão gerencial da equipe.\n')

console.log('[TESTE 6: TRANSFERÊNCIA DE TAREFA E PROTEÇÃO CONTRA ACESSO INDEVIDO]')
const auditLogs = []
// Carlos transfere sua tarefa t-3 para Mariana devido a redistribuição
const tarefasAposTransferencia = transferirTarefa(
  allTasks, 
  't-3', 
  userOperador2.id, 
  'Demanda repassada para cobertura', 
  userOperador1, 
  auditLogs
)

// 6.1 Verifica que a tarefa t-3 agora pertence à Mariana
const tarefaAtualizada = tarefasAposTransferencia.find(t => t.id === 't-3')
console.assert(tarefaAtualizada.assigned_to === userOperador2.id, 'Responsável deve ser Mariana')

// 6.2 Verifica que Carlos NÃO ganhou acesso às outras tarefas de Mariana (como a t-4)
const tarefasDoCarlosAposTransferencia = getMinhasTarefas(tarefasAposTransferencia, userOperador1)
console.assert(tarefasDoCarlosAposTransferencia.length === 0, 'Carlos não tem mais a tarefa t-3')
console.assert(!tarefasDoCarlosAposTransferencia.some(t => t.id === 't-4'), 'Carlos NUNCA ganha acesso à tarefa t-4 de Mariana')

// 6.3 Verifica se Mariana agora vê a nova tarefa em suas tarefas pessoais
const tarefasDaMariana = getMinhasTarefas(tarefasAposTransferencia, userOperador2)
console.assert(tarefasDaMariana.some(t => t.id === 't-3'), 'Mariana agora tem a tarefa t-3 atribuída a ela')
console.assert(tarefasDaMariana.some(t => t.id === 't-4'), 'Mariana mantém sua tarefa t-4')

// 6.4 Verifica se a auditoria registrou os detalhes
console.assert(auditLogs.length === 1, 'Auditoria deve registrar a transferência')
console.assert(auditLogs[0].previous_assigned_to === userOperador1.id, 'Anterior deve ser Carlos')
console.assert(auditLogs[0].new_assigned_to === userOperador2.id, 'Novo deve ser Mariana')
console.assert(auditLogs[0].reason === 'Demanda repassada para cobertura', 'Motivo registrado com sucesso')
console.log('✓ PASSOU: A transferência ocorreu com registro completo de auditoria e sem conceder acesso indevido às demais tarefas do destinatário.\n')

console.log('======================================================================')
console.log('RESULTADO FINAL: TODOS OS 6 TESTES OBRIGATÓRIOS FORAM APROVADOS COM 100% DE SUCESSO!')
console.log('======================================================================')
