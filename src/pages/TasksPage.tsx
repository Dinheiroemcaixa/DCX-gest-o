import React, { useState } from 'react'
import type { Task, ViewMode, FilterMode, Priority, Pop } from '../types'
import { useAuth } from '../context/AuthContext'
import { getPops } from '../lib/storage'
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
  Plus, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare 
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
  const { currentUser, profiles, isProprietario, isGestora, isOperador } = useAuth()
  const pops = getPops()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({})

  // Cálculo da data atual
  const todayStr = new Date().toISOString().split('T')[0]

  // Regra Principal Aprovada: Cada usuário autenticado vê EXCLUSIVAMENTE suas próprias tarefas
  let filtered = tasks.filter(t => t.status !== 'Concluida' && t.assigned_to === currentUser?.id)

  // Filtro de Status
  if (filterMode === 'open') {
    filtered = filtered.filter(t => t.status === 'Em Aberto' && t.due_date >= todayStr)
  } else if (filterMode === 'in_progress') {
    filtered = filtered.filter(t => t.status === 'Em Andamento')
  } else if (filterMode === 'late') {
    filtered = filtered.filter(t => t.due_date < todayStr)
  } else if (filterMode === 'high') {
    filtered = filtered.filter(t => t.priority === 'Alta')
  }

  // Busca textual
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.assigned_to_name && t.assigned_to_name.toLowerCase().includes(q))
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Barra de Filtros e Controles */}
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
            { id: 'all', label: 'Todas Ativas' },
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
                Nenhuma tarefa pendente neste filtro!
              </div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                Tudo em dia ou nenhuma atividade cadastrada com os critérios selecionados.
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

                          {/* Badge do POP Vinculado (Abre a gaveta) */}
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

                        {/* Detalhes de Subtarefas e Responsável */}
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

                      {/* Responsável */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '150px', flexShrink: 0 }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: task.assigned_to_color || 'var(--primary)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '10px'
                        }}>
                          {task.assigned_to_name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.assigned_to_name?.split(' ')[0]}
                        </span>
                      </div>

                      {/* Vencimento */}
                      <div style={{ width: '130px', flexShrink: 0, fontSize: '12.5px' }}>
                        <span style={{ color: isLate ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: isLate ? 700 : 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isLate && <AlertTriangle size={13} color="var(--danger)" />}
                          {task.due_date.split('-').reverse().join('/')}
                        </span>
                      </div>

                      {/* Prioridade */}
                      <div style={{ width: '70px', flexShrink: 0 }}>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* Status (Clicável para ciclo) */}
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

                      {/* Ações da Linha */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {/* Botão de Transferir Tarefa (Permitido para todos os perfis autorizados) */}
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

                        {/* Apenas Gestora ou Proprietário podem excluir tarefas */}
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

                    {/* Subtarefas Expansíveis na Linha */}
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
                          📅 {t.due_date.split('-').reverse().join('/')}
                        </span>
                        {getPriorityBadge(t.priority)}
                      </div>

                      <div style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {t.assigned_to_name?.split(' ')[0]}
                        </span>
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

      {/* ── MODO 3: CALENDÁRIO ─────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <CalIcon size={40} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Visão de Calendário Mensal</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Grade mensal com contagem de entregas ativas agrupadas por dia civil.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
