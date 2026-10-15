import React, { useState } from 'react'
import type { Task, ViewMode, FilterMode, Priority, Pop } from '../types'
import { useAuth } from '../context/AuthContext'
import { getPops } from '../lib/storage'
import { getTodayDateStr, formatDateBr, isDateWithinInterval } from '../lib/dateUtils'
import { 
  List, 
  Columns, 
  Calendar as CalIcon, 
  Check, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  ArrowRightLeft, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare,
  CalendarDays,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface TasksPageProps {
  tasks: Task[]
  onOpenEditTask: (task: Task) => void
  onOpenTransferTask: (task: Task) => void
  onOpenPopDrawer: (pop: Pop) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onCompleteTask: (taskId: string) => void
  onCycleStatus: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  searchQuery: string
}

type DateFilterType = 'today' | 'specific' | 'period'

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  onOpenEditTask,
  onOpenTransferTask,
  onOpenPopDrawer,
  onToggleSubtask,
  onCompleteTask,
  onCycleStatus,
  onDeleteTask,
  searchQuery
}) => {
  const { currentUser, isProprietario, isGestora } = useAuth()
  const pops = getPops()

  // 1. Data Operacional Atual (Fuso Horário Local)
  const todayStr = getTodayDateStr()

  // 2. Estados dos Filtros
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  
  // Filtro de Data: Padrão é sempre 'today' (Hoje)
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('today')
  const [specificDate, setSpecificDate] = useState<string>(todayStr)
  const [periodStartDate, setPeriodStartDate] = useState<string>(todayStr)
  const [periodEndDate, setPeriodEndDate] = useState<string>(todayStr)

  // Estado do mês no Calendário
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date())

  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({})

  // 3. Regra de Isolamento Pessoal: Apenas tarefas atribuídas ao usuário conectado
  let myTasks = tasks.filter(t => t.assigned_to === currentUser?.id)

  // 4. Regra de Data/Período
  let filtered = myTasks.filter(t => {
    // Não lista tarefas concluídas na visualização ativa
    if (t.status === 'Concluida') return false

    if (dateFilterType === 'today') {
      // Exclusivamente as tarefas com vencimento hoje (não lista futuro indiscriminadamente)
      return t.due_date === todayStr
    } else if (dateFilterType === 'specific') {
      // Dia específico selecionado
      return t.due_date === specificDate
    } else if (dateFilterType === 'period') {
      // Intervalo entre data inicial e data final (inclusivo)
      return isDateWithinInterval(t.due_date, periodStartDate, periodEndDate)
    }
    return true
  })

  // 5. Filtro de Status Adicional
  if (filterMode === 'open') {
    filtered = filtered.filter(t => t.status === 'Em Aberto')
  } else if (filterMode === 'in_progress') {
    filtered = filtered.filter(t => t.status === 'Em Andamento')
  } else if (filterMode === 'late') {
    filtered = filtered.filter(t => t.due_date < todayStr)
  } else if (filterMode === 'high') {
    filtered = filtered.filter(t => t.priority === 'Alta')
  }

  // 6. Busca Textual
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    )
  }

  const isTaskLate = (t: Task) => t.status !== 'Concluida' && t.due_date < todayStr

  const getPriorityBadge = (p: Priority) => {
    if (p === 'Alta') return <span className="badge badge-danger">Alta</span>
    if (p === 'Media') return <span className="badge badge-warning">Média</span>
    return <span className="badge badge-neutral">Baixa</span>
  }

  const toggleExpand = (taskId: string) => {
    setExpandedSubtasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const handleSelectDayInCalendar = (dateStr: string) => {
    setSpecificDate(dateStr)
    setDateFilterType('specific')
  }

  // Calendário Mensal
  const renderCalendarGrid = () => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days = []
    // Dias vazios do início
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} style={{ height: '90px', backgroundColor: 'var(--surface-alt)', opacity: 0.3, borderRadius: 'var(--radius-sm)' }} />)
    }

    // Dias do mês corrente
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday = currentDayStr === todayStr
      const isSelected = (dateFilterType === 'specific' && currentDayStr === specificDate) || (dateFilterType === 'today' && isToday)
      const isInPeriod = dateFilterType === 'period' && isDateWithinInterval(currentDayStr, periodStartDate, periodEndDate)
      const dayTasks = myTasks.filter(t => t.due_date === currentDayStr && t.status !== 'Concluida')

      days.push(
        <div
          key={currentDayStr}
          onClick={() => handleSelectDayInCalendar(currentDayStr)}
          style={{
            height: '90px',
            backgroundColor: isSelected ? 'var(--primary-soft)' : isInPeriod ? 'rgba(37, 99, 235, 0.08)' : 'var(--surface)',
            border: isSelected ? '2px solid var(--primary)' : isInPeriod ? '1px dashed var(--primary)' : isToday ? '2px solid var(--warning)' : '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'var(--transition)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontWeight: isToday || isSelected ? 800 : 600,
              fontSize: '13px',
              color: isToday ? 'var(--primary)' : 'var(--text-main)'
            }}>
              {d} {isToday && <span style={{ fontSize: '10px' }}>(Hoje)</span>}
            </span>
            {dayTasks.length > 0 && (
              <span className="badge badge-primary" style={{ padding: '1px 6px', fontSize: '10px' }}>
                {dayTasks.length}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
            {dayTasks.slice(0, 2).map(t => (
              <div
                key={t.id}
                style={{
                  fontSize: '10.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: isTaskLate(t) ? 'var(--danger)' : 'var(--text-secondary)'
                }}
              >
                • {t.title}
              </div>
            ))}
            {dayTasks.length > 2 && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                +{dayTasks.length - 2} mais
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navegação do Mês */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
            >
              <ChevronLeft size={16} /> Mês Anterior
            </button>
            <h3 style={{ fontSize: '16px', fontWeight: 700, minWidth: '180px', textAlign: 'center' }}>
              {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
            >
              Próximo Mês <ChevronRight size={16} />
            </button>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setCalendarMonth(new Date())
              handleSelectDayInCalendar(todayStr)
            }}
          >
            Ir para Mês Atual
          </button>
        </div>

        {/* Grade de Dias */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '12px',
          color: 'var(--text-muted)'
        }}>
          <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {days}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── BARRA DE CONTROLE DE DATA / PERÍODO (NOVA) ────────────────────── */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Seletor dos Três Modos de Data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarDays size={16} color="var(--primary)" />
            Filtro de Data:
          </span>

          {/* Opção 1: Hoje */}
          <button
            className={`btn btn-sm ${dateFilterType === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDateFilterType('today')}
            title="Exibe as tarefas programadas para hoje"
          >
            Hoje ({formatDateBr(todayStr)})
          </button>

          {/* Opção 2: Dia Específico */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className={`btn btn-sm ${dateFilterType === 'specific' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateFilterType('specific')}
            >
              Dia Específico:
            </button>
            <input
              type="date"
              className="form-input"
              style={{ width: '135px', padding: '4px 8px', fontSize: '12px' }}
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value)
                setDateFilterType('specific')
              }}
            />
          </div>

          {/* Opção 3: Período de Datas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${dateFilterType === 'period' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateFilterType('period')}
            >
              Período:
            </button>
            <input
              type="date"
              className="form-input"
              style={{ width: '130px', padding: '4px 8px', fontSize: '12px' }}
              value={periodStartDate}
              onChange={(e) => {
                setPeriodStartDate(e.target.value)
                setDateFilterType('period')
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>até</span>
            <input
              type="date"
              className="form-input"
              style={{ width: '130px', padding: '4px 8px', fontSize: '12px' }}
              value={periodEndDate}
              onChange={(e) => {
                setPeriodEndDate(e.target.value)
                setDateFilterType('period')
              }}
            />
          </div>
        </div>

        {/* Botão de Retorno Rápido para Hoje (se estiver filtrando outra data) */}
        {dateFilterType !== 'today' && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setDateFilterType('today')}
            style={{ color: 'var(--primary)', fontWeight: 600 }}
          >
            <RotateCcw size={14} />
            Voltar para Hoje
          </button>
        )}
      </div>

      {/* Indicador Textual Amigável da Consulta Atual */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
        fontSize: '12.5px',
        color: 'var(--text-secondary)'
      }}>
        <div>
          {dateFilterType === 'today' && (
            <span>📅 Exibindo <strong>tarefas de hoje ({formatDateBr(todayStr)})</strong></span>
          )}
          {dateFilterType === 'specific' && (
            <span>📅 Exibindo <strong>dia específico: {formatDateBr(specificDate)}</strong></span>
          )}
          {dateFilterType === 'period' && (
            <span>📅 Exibindo período de <strong>{formatDateBr(periodStartDate)}</strong> até <strong>{formatDateBr(periodEndDate)}</strong></span>
          )}
        </div>
        <div>
          Total listado: <strong>{filtered.length} {filtered.length === 1 ? 'tarefa' : 'tarefas'}</strong>
        </div>
      </div>

      {/* ── BARRA DE FILTROS DE STATUS E MODOS DE VISUALIZAÇÃO ──────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px'
      }}>
        {/* Filtros de Status */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todas do Filtro' },
            { id: 'open', label: 'Em Aberto' },
            { id: 'in_progress', label: 'Em Andamento' },
            { id: 'late', label: 'Atrasadas' },
            { id: 'high', label: 'Alta Prioridade' },
          ].map(f => (
            <button
              key={f.id}
              className={`btn btn-sm ${filterMode === f.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterMode(f.id as FilterMode)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Alternador de Modo de Visualização */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--surface-alt)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px' }}
            onClick={() => setViewMode('list')}
            title="Visualização em Lista"
          >
            <List size={16} />
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px' }}
            onClick={() => setViewMode('kanban')}
            title="Visualização em Kanban"
          >
            <Columns size={16} />
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px' }}
            onClick={() => setViewMode('calendar')}
            title="Visualização em Calendário"
          >
            <CalIcon size={16} />
          </button>
        </div>
      </div>

      {/* ── MODO 1: LISTA TABULAR ────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <CheckSquare size={44} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-secondary)' }}>
                Nenhuma tarefa para o período selecionado!
              </div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                {dateFilterType === 'today'
                  ? 'Você não possui tarefas pendentes para hoje. Use os filtros de data para consultar outros dias ou adicione uma nova tarefa.'
                  : 'Nenhuma atividade encontrada para os critérios informados.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map(task => {
                const isLate = isTaskLate(task)
                const isExpanded = !!expandedSubtasks[task.id]
                const completedSubs = task.subtasks?.filter(s => s.is_completed).length || 0
                const totalSubs = task.subtasks?.length || 0
                const pop = pops.find(p => p.id === task.pop_id)

                return (
                  <div
                    key={task.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: isLate ? 'var(--danger-soft)' : 'var(--surface)',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}>
                      {/* Botão de Conclusão Direta */}
                      <button
                        onClick={() => onCompleteTask(task.id)}
                        title="Marcar como Concluída"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-sm)',
                          border: '2px solid var(--border-strong)',
                          backgroundColor: 'var(--surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'transparent',
                          transition: 'var(--transition)',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--success)'; e.currentTarget.style.color = 'var(--success)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'transparent'; }}
                      >
                        <Check size={14} />
                      </button>

                      {/* Título, POP e Checklist */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontWeight: 600,
                            fontSize: '14px',
                            color: 'var(--text-main)',
                            wordBreak: 'break-word'
                          }}>
                            {task.title}
                          </span>

                          {/* Badge do POP Vinculado */}
                          {pop && (
                            <button
                              onClick={() => onOpenPopDrawer(pop)}
                              className="badge badge-primary"
                              style={{
                                cursor: 'pointer',
                                border: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Clique para abrir as instruções do POP na gaveta lateral"
                            >
                              <BookOpen size={11} />
                              Guia: {pop.code}
                            </button>
                          )}

                          {/* Badge de Recorrência */}
                          {task.recurrence_type !== 'none' && (
                            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                              🔁 {task.recurrence_type}
                            </span>
                          )}
                        </div>

                        {/* Detalhes de Subtarefas e Descrição */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {totalSubs > 0 && (
                            <button
                              onClick={() => toggleExpand(task.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: completedSubs === totalSubs ? 'var(--success)' : 'var(--primary)',
                                fontWeight: 600,
                                fontSize: '11.5px',
                                padding: 0
                              }}
                            >
                              <CheckSquare size={13} />
                              <span>{completedSubs}/{totalSubs} etapas</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          )}

                          {task.description && (
                            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                              {task.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vencimento Operacional */}
                      <div style={{ width: '130px', flexShrink: 0, fontSize: '12.5px' }}>
                        <span style={{ color: isLate ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: isLate ? 700 : 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isLate && <AlertTriangle size={13} color="var(--danger)" />}
                          {formatDateBr(task.due_date)}
                        </span>
                      </div>

                      {/* Prioridade */}
                      <div style={{ width: '70px', flexShrink: 0 }}>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* Status */}
                      <div style={{ width: '110px', flexShrink: 0 }}>
                        <button
                          onClick={() => onCycleStatus(task.id)}
                          className={`badge ${task.status === 'Em Andamento' ? 'badge-warning' : 'badge-neutral'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title="Clique para alternar entre Em Aberto e Em Andamento"
                        >
                          {task.status}
                        </button>
                      </div>

                      {/* Ações */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => onOpenTransferTask(task)}
                          title="Transferir responsabilidade desta tarefa para outro colega"
                          style={{ padding: '6px', color: 'var(--primary)' }}
                        >
                          <ArrowRightLeft size={15} />
                        </button>

                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => onOpenEditTask(task)}
                          title="Editar tarefa"
                          style={{ padding: '6px' }}
                        >
                          <Edit3 size={15} />
                        </button>

                        {(isProprietario || isGestora) && (
                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => onDeleteTask(task.id)}
                            title="Excluir tarefa"
                            style={{ padding: '6px', color: 'var(--danger)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subtarefas Expansíveis */}
                    {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                      <div style={{
                        padding: '10px 20px 14px 58px',
                        backgroundColor: 'var(--surface-alt)',
                        borderTop: '1px dashed var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {task.subtasks.map(sub => (
                          <div
                            key={sub.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12.5px',
                              cursor: 'pointer'
                            }}
                            onClick={() => onToggleSubtask(task.id, sub.id)}
                          >
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              border: sub.is_completed ? 'none' : '1.5px solid var(--border-strong)',
                              backgroundColor: sub.is_completed ? 'var(--success)' : 'var(--surface)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px'
                            }}>
                              {sub.is_completed && <Check size={12} />}
                            </div>
                            <span style={{
                              textDecoration: sub.is_completed ? 'line-through' : 'none',
                              color: sub.is_completed ? 'var(--text-muted)' : 'var(--text-main)'
                            }}>
                              {sub.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODO 2: KANBAN ─────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          alignItems: 'start'
        }}>
          {[
            { id: 'aberto', label: 'Em Aberto', filter: (t: Task) => t.status === 'Em Aberto' && !isTaskLate(t), color: 'var(--primary)' },
            { id: 'andamento', label: 'Em Andamento', filter: (t: Task) => t.status === 'Em Andamento', color: 'var(--warning)' },
            { id: 'atrasada', label: 'Atrasadas', filter: (t: Task) => isTaskLate(t), color: 'var(--danger)' }
          ].map(col => {
            const colTasks = filtered.filter(col.filter)

            return (
              <div
                key={col.id}
                className="card"
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--surface-alt)',
                  borderTop: `4px solid ${col.color}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                    {col.label}
                  </span>
                  <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                    {colTasks.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {colTasks.map(t => (
                    <div
                      key={t.id}
                      className="card"
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--surface)',
                        cursor: 'pointer'
                      }}
                      onClick={() => onOpenEditTask(t)}
                    >
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)', marginBottom: '6px' }}>
                        {t.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginTop: '10px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          📅 {formatDateBr(t.due_date)}
                        </span>
                        {getPriorityBadge(t.priority)}
                      </div>

                      <div style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end'
                      }}>
                        <button
                          className="btn btn-success btn-sm"
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCompleteTask(t.id)
                          }}
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODO 3: CALENDÁRIO MENSUAL ─────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="card" style={{ padding: '24px' }}>
          {renderCalendarGrid()}

          {/* Lista de Tarefas do Dia Selecionado no Calendário */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
              {dateFilterType === 'today' && `Tarefas Agendadas para Hoje (${formatDateBr(todayStr)}) (${filtered.length})`}
              {dateFilterType === 'specific' && `Tarefas Agendadas para ${formatDateBr(specificDate)} (${filtered.length})`}
              {dateFilterType === 'period' && `Tarefas Agendadas para o Período (${formatDateBr(periodStartDate)} até ${formatDateBr(periodEndDate)}) (${filtered.length})`}
            </h4>

            {filtered.length === 0 ? (
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Nenhuma tarefa para este dia.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filtered.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--surface-alt)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px'
                    }}
                  >
                    <span>{t.title}</span>
                    <span className="badge badge-neutral">{t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
