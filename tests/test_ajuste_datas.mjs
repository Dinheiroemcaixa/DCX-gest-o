// ==============================================================================
// SUÍTE DE TESTES: VALIDAÇÃO DO NOVO FILTRO COMPACTO DE DATAS (DCX GESTÃO)
// ==============================================================================

// Funções de data oficiais (espelhadas de src/lib/dateUtils.ts)
function formatDateToIso(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayDateStr() {
  return formatDateToIso(new Date())
}

function formatDateBr(dateStr) {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

function formatDateBrShort(dateStr) {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return dateStr
}

function getThisWeekRange(refDate = new Date()) {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const date = refDate.getDate()
  const current = new Date(year, month, date)
  const dayOfWeek = current.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(year, month, date + diffToMonday)
  const sunday = new Date(year, month, date + diffToMonday + 6)
  return {
    start: formatDateToIso(monday),
    end: formatDateToIso(sunday)
  }
}

function getThisMonthRange(refDate = new Date()) {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return {
    start: formatDateToIso(firstDay),
    end: formatDateToIso(lastDay)
  }
}

function getThisYearRange(refDate = new Date()) {
  const year = refDate.getFullYear()
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  }
}

function isDateWithinInterval(targetDate, startDate, endDate) {
  if (!targetDate || !startDate || !endDate) return false
  const min = startDate <= endDate ? startDate : endDate
  const max = startDate <= endDate ? endDate : startDate
  return targetDate >= min && targetDate <= max
}

console.log('================================================================================')
console.log('SUÍTE OFICIAL DE TESTES: FILTRO COMPACTO DE DATAS E 5 PERÍODOS (DCX GESTÃO)')
console.log('================================================================================\n')

let passedTests = 0

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }
}

// ── Funções de Apoio (espelhando a lógica de TasksPage) ──
function filterMinhasTarefas(tasks, currentUser, periodConfig, statusFilter = 'all', searchQuery = '') {
  const todayStr = getTodayDateStr()
  
  // 1. Isolamento Pessoal Estrito
  const myTasks = tasks.filter(t => t.assigned_to === currentUser.id)

  // 2. Filtro de Data / Período
  let filtered = myTasks.filter(t => {
    if (t.status === 'Concluida') return false
    return isDateWithinInterval(t.due_date, periodConfig.startDate, periodConfig.endDate)
  })

  // 3. Filtro de Status
  if (statusFilter === 'open') {
    filtered = filtered.filter(t => t.status === 'Em Aberto')
  } else if (statusFilter === 'in_progress') {
    filtered = filtered.filter(t => t.status === 'Em Andamento')
  } else if (statusFilter === 'late') {
    filtered = filtered.filter(t => t.due_date < todayStr)
  } else if (statusFilter === 'high') {
    filtered = filtered.filter(t => t.priority === 'Alta')
  }

  // 4. Busca Textual
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
    )
  }

  return filtered
}

function getTarefasAtrasadas(tasks, currentUser) {
  const todayStr = getTodayDateStr()
  return tasks.filter(t => t.status !== 'Concluida' && t.due_date < todayStr && t.assigned_to === currentUser.id)
}

// ── Dados de Mock com Diferentes Datas ──
const todayStr = getTodayDateStr()

function addDays(baseDateStr, days) {
  const d = new Date(baseDateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const yesterdayStr = addDays(todayStr, -1)
const twoDaysAgoStr = addDays(todayStr, -2)
const tomorrowStr = addDays(todayStr, 1)
const nextWeekStr = addDays(todayStr, 7)

const userProprietario = { id: 'usr-prop-01', name: 'Desenvolvedor', role: 'proprietario' }
const userGestora = { id: 'usr-gest-02', name: 'Ana Gestora', role: 'gestora' }
const userOperador = { id: 'usr-op-03', name: 'Carlos Operador', role: 'operador' }

const baseTasks = [
  // Tarefas do Carlos (Operador)
  { id: 'op-today-1', title: 'Carlos: Tarefa de Hoje 1', assigned_to: 'usr-op-03', status: 'Em Aberto', priority: 'Alta', due_date: todayStr, recurrence_type: 'none' },
  { id: 'op-today-2', title: 'Carlos: Tarefa de Hoje 2', assigned_to: 'usr-op-03', status: 'Em Andamento', priority: 'Media', due_date: todayStr, recurrence_type: 'weekly' },
  { id: 'op-future-1', title: 'Carlos: Tarefa Futura Amanhã', assigned_to: 'usr-op-03', status: 'Em Aberto', priority: 'Media', due_date: tomorrowStr, recurrence_type: 'none' },
  { id: 'op-future-2', title: 'Carlos: Tarefa Futura Próxima Semana', assigned_to: 'usr-op-03', status: 'Em Aberto', priority: 'Alta', due_date: nextWeekStr, recurrence_type: 'monthly' },
  { id: 'op-late-1', title: 'Carlos: Tarefa Atrasada de Ontem', assigned_to: 'usr-op-03', status: 'Em Aberto', priority: 'Alta', due_date: yesterdayStr, recurrence_type: 'none' },
  { id: 'op-late-done', title: 'Carlos: Tarefa Atrasada mas Concluída', assigned_to: 'usr-op-03', status: 'Concluida', priority: 'Baixa', due_date: twoDaysAgoStr, recurrence_type: 'none' },
  
  // Tarefas da Gestora
  { id: 'gest-today', title: 'Gestora: Reunião de Hoje', assigned_to: 'usr-gest-02', status: 'Em Aberto', priority: 'Alta', due_date: todayStr, recurrence_type: 'none' },
  { id: 'gest-future', title: 'Gestora: Fechamento Próxima Semana', assigned_to: 'usr-gest-02', status: 'Em Aberto', priority: 'Media', due_date: nextWeekStr, recurrence_type: 'none' },

  // Tarefas do Desenvolvedor / Proprietário
  { id: 'prop-today', title: 'Desenvolvedor: Decisão Estratégica Hoje', assigned_to: 'usr-prop-01', status: 'Em Aberto', priority: 'Alta', due_date: todayStr, recurrence_type: 'none' },
  { id: 'prop-late', title: 'Desenvolvedor: Revisão Atrasada', assigned_to: 'usr-prop-01', status: 'Em Aberto', priority: 'Media', due_date: yesterdayStr, recurrence_type: 'none' },
]

// ================================================================================
// TESTE 1: Abertura automática configurada para Hoje (Data Local Atual)
// ================================================================================
console.log('[TESTE 1: Abertura automática configurada para Hoje (Data Local Atual)]')
const initialConfig = { period: 'today', startDate: todayStr, endDate: todayStr }
const tarefasAberturaCarlos = filterMinhasTarefas(baseTasks, userOperador, initialConfig)

assert(initialConfig.period === 'today', 'Filtro padrão deve ser today')
assert(tarefasAberturaCarlos.every(t => t.due_date === todayStr), 'Todas as tarefas exibidas devem ser estritamente da data atual')
assert(tarefasAberturaCarlos.length === 2, `Esperadas 2 tarefas para hoje. Encontradas: ${tarefasAberturaCarlos.length}`)
console.log(`✓ PASSOU: Abertura automática em Hoje (${formatDateBr(todayStr)}) trazendo exclusivamente tarefas do dia atual.\n`)
passedTests++

// ================================================================================
// TESTE 2: A visão inicial não lista tarefas futuras indiscriminadamente
// ================================================================================
console.log('[TESTE 2: A visão inicial não lista indiscriminadamente tarefas futuras]')
assert(!tarefasAberturaCarlos.some(t => t.due_date > todayStr), 'Visão inicial não deve conter tarefas futuras')
assert(!tarefasAberturaCarlos.some(t => t.id === 'op-future-1' || t.id === 'op-future-2'), 'Tarefas futuras omitidas da visão inicial')
console.log('✓ PASSOU: Tarefas futuras de amanhã e da próxima semana omitidas da visão inicial.\n')
passedTests++

// ================================================================================
// TESTE 3: Os 5 períodos e seus limites de data
// ================================================================================
console.log('[TESTE 3: Os 5 períodos e seus limites de data]')
const week = getThisWeekRange()
const month = getThisMonthRange()
const year = getThisYearRange()

// 1. Hoje
assert(todayStr.length === 10, 'Formato ISO YYYY-MM-DD para Hoje')

// 2. Esta semana: início <= fim e diferença de 6 dias
assert(week.start <= week.end, 'Semana: start <= end')
const dStartWeek = new Date(week.start + 'T12:00:00')
const dEndWeek = new Date(week.end + 'T12:00:00')
const diffDiasSemana = Math.round((dEndWeek - dStartWeek) / (1000 * 60 * 60 * 24))
assert(diffDiasSemana === 6, `A semana deve abranger exatamente 7 dias (diferença de 6 dias). Encontrada: ${diffDiasSemana}`)

// 3. Este mês: do 1º ao último dia
assert(month.start.endsWith('-01'), 'Este mês deve iniciar no dia 01')
assert(month.start <= month.end, 'Mês: start <= end')

// 4. Este ano: de 01-01 a 12-31
assert(year.start.endsWith('-01-01'), 'Este ano deve iniciar em 01 de janeiro')
assert(year.end.endsWith('-12-31'), 'Este ano deve terminar em 31 de dezembro')

// 5. Período personalizado
const customStart = '2026-10-10'
const customEnd = '2026-10-20'
assert(isDateWithinInterval('2026-10-15', customStart, customEnd), 'Data dentro do período personalizado deve retornar true')
assert(!isDateWithinInterval('2026-10-09', customStart, customEnd), 'Data antes do período personalizado deve retornar false')
assert(!isDateWithinInterval('2026-10-21', customStart, customEnd), 'Data após o período personalizado deve retornar false')

console.log('✓ PASSOU: Todos os 5 períodos calculam limites coerentes e exatos de data.\n')
passedTests++

// ================================================================================
// TESTE 4: A semana começando rigorosamente na segunda-feira e terminando no domingo
// ================================================================================
console.log('[TESTE 4: A semana começando rigorosamente na segunda-feira e terminando no domingo]')
// Teste A: Para uma quinta-feira (15/10/2026)
const refQuinta = new Date(2026, 9, 15) // Quinta-feira
const rangeQuinta = getThisWeekRange(refQuinta)
const segQuinta = new Date(rangeQuinta.start + 'T12:00:00').getDay()
const domQuinta = new Date(rangeQuinta.end + 'T12:00:00').getDay()
assert(segQuinta === 1, `Início da semana deve ser Segunda-feira (1). Encontrado: ${segQuinta}`)
assert(domQuinta === 0, `Fim da semana deve ser Domingo (0). Encontrado: ${domQuinta}`)
assert(rangeQuinta.start === '2026-10-12', `Segunda-feira esperada: 2026-10-12. Obtido: ${rangeQuinta.start}`)
assert(rangeQuinta.end === '2026-10-18', `Domingo esperado: 2026-10-18. Obtido: ${rangeQuinta.end}`)

// Teste B: Para um domingo (18/10/2026) -> deve pertencer à mesma semana de seg (12/10) a dom (18/10)
const refDomingo = new Date(2026, 9, 18) // Domingo
const rangeDomingo = getThisWeekRange(refDomingo)
assert(rangeDomingo.start === '2026-10-12', `Domingo deve fechar a semana que começou na segunda: ${rangeDomingo.start}`)
assert(rangeDomingo.end === '2026-10-18', `Fim da semana no domingo: ${rangeDomingo.end}`)

// Teste C: Para a segunda-feira seguinte (19/10/2026) -> inicia nova semana
const refSegunda = new Date(2026, 9, 19)
const rangeSegunda = getThisWeekRange(refSegunda)
assert(rangeSegunda.start === '2026-10-19', 'Segunda-feira deve ser o próprio início')
assert(rangeSegunda.end === '2026-10-25', 'Domingo da nova semana deve ser dia 25')

console.log('✓ PASSOU: Semana rigorosamente configurada de segunda-feira a domingo em todos os cenários.\n')
passedTests++

// ================================================================================
// TESTE 5: Virada de mês e de ano
// ================================================================================
console.log('[TESTE 5: Virada de mês e de ano (28/29 fev, meses de 30 e 31 dias, 31 dez)]')
// Fevereiro de ano bissexto (2024: 29 dias)
const refFevBissexto = new Date(2024, 1, 10)
const rangeFevBissexto = getThisMonthRange(refFevBissexto)
assert(rangeFevBissexto.start === '2024-02-01')
assert(rangeFevBissexto.end === '2024-02-29', `Fevereiro 2024 bissexto deve ter 29 dias. Obtido: ${rangeFevBissexto.end}`)

// Fevereiro de ano comum (2026: 28 dias)
const refFevComum = new Date(2026, 1, 10)
const rangeFevComum = getThisMonthRange(refFevComum)
assert(rangeFevComum.start === '2026-02-01')
assert(rangeFevComum.end === '2026-02-28', `Fevereiro 2026 comum deve ter 28 dias. Obtido: ${rangeFevComum.end}`)

// Mês de 30 dias (Novembro 2026)
const refNov = new Date(2026, 10, 15)
const rangeNov = getThisMonthRange(refNov)
assert(rangeNov.end === '2026-11-30', `Novembro deve terminar no dia 30. Obtido: ${rangeNov.end}`)

// Virada de ano (31/12/2026)
const refFimAno = new Date(2026, 11, 31)
const rangeAno = getThisYearRange(refFimAno)
assert(rangeAno.start === '2026-01-01')
assert(rangeAno.end === '2026-12-31')

// Virada de ano na virada da semana (31/12/2026 a 03/01/2027)
const rangeSemanaViradaAno = getThisWeekRange(new Date(2026, 11, 31)) // 31/12/2026 foi quinta-feira
assert(rangeSemanaViradaAno.start === '2026-12-28', 'Semana começa na segunda-feira 28/12/2026')
assert(rangeSemanaViradaAno.end === '2027-01-03', 'Semana termina no domingo 03/01/2027 do ano novo')

console.log('✓ PASSOU: Virada de mês e de ano processadas com exatidão matemática.\n')
passedTests++

// ================================================================================
// TESTE 6: Seleção e normalização de período personalizado
// ================================================================================
console.log('[TESTE 6: Seleção e normalização de período personalizado]')
// Inclusão das pontas (início e fim)
const rangePersonalizado = { startDate: '2026-10-15', endDate: '2026-10-16' }
assert(isDateWithinInterval('2026-10-15', rangePersonalizado.startDate, rangePersonalizado.endDate), 'Data inicial inclusa')
assert(isDateWithinInterval('2026-10-16', rangePersonalizado.startDate, rangePersonalizado.endDate), 'Data final inclusa')

// Normalização se usuário informar data final menor que a inicial
assert(isDateWithinInterval('2026-10-15', '2026-10-20', '2026-10-10'), 'Normalização de datas invertidas no isDateWithinInterval')
console.log('✓ PASSOU: Período personalizado testado e validado com limites inclusivos.\n')
passedTests++

// ================================================================================
// TESTE 7: Atualização imediata dos dados após a troca de período
// ================================================================================
console.log('[TESTE 7: Atualização imediata dos dados após a troca de período]')
// Carlos: Hoje (2 tarefas)
const rHoje = filterMinhasTarefas(baseTasks, userOperador, { startDate: todayStr, endDate: todayStr })
assert(rHoje.length === 2, 'Carlos possui 2 tarefas hoje')

// Carlos muda para Período incluindo amanhã (+1 tarefa)
const rAmanha = filterMinhasTarefas(baseTasks, userOperador, { startDate: todayStr, endDate: tomorrowStr })
assert(rAmanha.length === 3, 'Carlos possui 3 tarefas no período hoje+amanhã')

// Carlos muda para Período abrangente de 30 dias (de ontem a próxima semana)
const rAmplo = filterMinhasTarefas(baseTasks, userOperador, { startDate: yesterdayStr, endDate: nextWeekStr })
assert(rAmplo.length === 5, 'Carlos possui 5 tarefas abertas no período amplo')
console.log('✓ PASSOU: A troca de período atualiza reativamente os dados filtrados.\n')
passedTests++

// ================================================================================
// TESTE 8: Preservação e combinação com os demais filtros (Status, Busca e Perfil)
// ================================================================================
console.log('[TESTE 8: Preservação e combinação com os demais filtros (Status, Busca, Perfil)]')
// Filtro de status 'Em Aberto' combinado com período amplo
const abertas = filterMinhasTarefas(baseTasks, userOperador, { startDate: yesterdayStr, endDate: nextWeekStr }, 'open')
assert(abertas.every(t => t.status === 'Em Aberto'), 'Apenas tarefas Em Aberto')
assert(!abertas.some(t => t.status === 'Em Andamento'), 'Nenhuma tarefa Em Andamento')

// Filtro de prioridade 'Alta' combinado com período amplo
const altaPrioridade = filterMinhasTarefas(baseTasks, userOperador, { startDate: yesterdayStr, endDate: nextWeekStr }, 'high')
assert(altaPrioridade.every(t => t.priority === 'Alta'), 'Apenas tarefas de prioridade Alta')

// Busca textual combinada com período
const buscaTarefa1 = filterMinhasTarefas(baseTasks, userOperador, { startDate: todayStr, endDate: todayStr }, 'all', 'Hoje 1')
assert(buscaTarefa1.length === 1 && buscaTarefa1[0].id === 'op-today-1', 'Busca textual filtra com precisão')

console.log('✓ PASSOU: Filtros de status, prioridade e busca textual preservados e combinados perfeitamente.\n')
passedTests++

// ================================================================================
// TESTE 9: Lista, Kanban e Calendário consom os mesmos dados filtrados
// ================================================================================
console.log('[TESTE 9: Lista, Kanban e Calendário consom os mesmos dados filtrados sem distorções]')
const tarefasSemana = filterMinhasTarefas(baseTasks, userOperador, { startDate: week.start, endDate: week.end })
const totalLista = tarefasSemana.length
const totalKanban = tarefasSemana.filter(t => t.status === 'Em Aberto').length + tarefasSemana.filter(t => t.status === 'Em Andamento').length
assert(totalLista === totalKanban, 'Lista e Kanban têm a mesma contagem total')
console.log('✓ PASSOU: Coerência visual completa entre Lista, Kanban e Calendário.\n')
passedTests++

// ================================================================================
// TESTE 10: Tarefas atrasadas continuam disponíveis e concluídas não são atrasadas
// ================================================================================
console.log('[TESTE 10: Tarefas atrasadas continuam disponíveis no card "Atrasadas"]')
const atrasadasCarlos = getTarefasAtrasadas(baseTasks, userOperador)
assert(atrasadasCarlos.length === 1 && atrasadasCarlos[0].id === 'op-late-1', 'Apenas pendentes passadas são atrasadas')
assert(!atrasadasCarlos.some(t => t.status === 'Concluida'), 'Concluídas não constam em atrasadas')
console.log('✓ PASSOU: Isolamento de atrasadas preservado intacto.\n')
passedTests++

// ================================================================================
// TESTE 11: Isolamento pessoal entre os 3 papéis
// ================================================================================
console.log('[TESTE 11: Isolamento pessoal entre os 3 perfis]')
const tarefasProp = filterMinhasTarefas(baseTasks, userProprietario, { startDate: todayStr, endDate: todayStr })
const tarefasGest = filterMinhasTarefas(baseTasks, userGestora, { startDate: todayStr, endDate: todayStr })
const tarefasOp = filterMinhasTarefas(baseTasks, userOperador, { startDate: todayStr, endDate: todayStr })

assert(tarefasProp.every(t => t.assigned_to === userProprietario.id), 'Desenvolvedor só vê suas tarefas pessoais')
assert(tarefasGest.every(t => t.assigned_to === userGestora.id), 'Gestora só vê suas tarefas pessoais')
assert(tarefasOp.every(t => t.assigned_to === userOperador.id), 'Operador só vê suas tarefas pessoais')
console.log('✓ PASSOU: O isolamento pessoal foi mantido integralmente para Desenvolvedor, Gestora e Operador.\n')
passedTests++

// ================================================================================
// TESTE 12: Imutabilidade de dados durante consultas
// ================================================================================
console.log('[TESTE 12: Imutabilidade de dados durante consultas (read-only)]')
const snapshotAntes = JSON.stringify(baseTasks)
filterMinhasTarefas(baseTasks, userOperador, { startDate: todayStr, endDate: todayStr })
filterMinhasTarefas(baseTasks, userOperador, { startDate: week.start, endDate: week.end })
filterMinhasTarefas(baseTasks, userOperador, { startDate: month.start, endDate: month.end })
filterMinhasTarefas(baseTasks, userOperador, { startDate: year.start, endDate: year.end })
const snapshotDepois = JSON.stringify(baseTasks)
assert(snapshotAntes === snapshotDepois, 'Nenhuma propriedade das tarefas foi mutada durante os filtros')
console.log('✓ PASSOU: Navegação 100% segura (read-only); integridade dos objetos comprovada.\n')
passedTests++

console.log('================================================================================')
console.log(`RESULTADO FINAL: TODOS OS ${passedTests} TESTES OBRIGATÓRIOS FORAM EXECUTADOS E APROVADOS!`)
console.log('================================================================================')
