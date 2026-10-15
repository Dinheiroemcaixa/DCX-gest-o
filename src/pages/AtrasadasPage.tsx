import React from 'react'
import type { Task, Pop } from '../types'
import { useAuth } from '../context/AuthContext'
import { getPops } from '../lib/storage'
import { getTodayDateStr, formatDateBr } from '../lib/dateUtils'
import { Clock, AlertTriangle, Check, BookOpen, ArrowRightLeft } from 'lucide-react'

interface AtrasadasPageProps {
  tasks: Task[]
  onCompleteTask: (taskId: string) => void
  onOpenTransferTask: (task: Task) => void
  onOpenPopDrawer: (pop: Pop) => void
}

export const AtrasadasPage: React.FC<AtrasadasPageProps> = ({
  tasks,
  onCompleteTask,
  onOpenTransferTask,
  onOpenPopDrawer
}) => {
  const { currentUser } = useAuth()
  const pops = getPops()
  const todayStr = getTodayDateStr()

  // Regra Pessoal Aprovada: Cada usuário autenticado vê exclusivamente suas próprias tarefas atrasadas
  let lateTasks = tasks.filter(t => t.status !== 'Concluida' && t.due_date < todayStr && t.assigned_to === currentUser?.id)

  // Agrupa por data de vencimento
  const groups: Record<string, Task[]> = {}
  lateTasks.forEach(t => {
    if (!groups[t.due_date]) groups[t.due_date] = []
    groups[t.due_date].push(t)
  })

  const sortedDates = Object.keys(groups).sort()

  const calculateDaysLate = (dueDateStr: string) => {
    const due = new Date(dueDateStr + 'T00:00:00').getTime()
    const today = new Date(todayStr + 'T00:00:00').getTime()
    return Math.max(1, Math.floor((today - due) / 86400000))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alerta Superior */}
      <div style={{
        backgroundColor: 'var(--danger-soft)',
        border: '1px solid var(--danger-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={24} color="var(--danger)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--danger)' }}>
              Atenção: {lateTasks.length} {lateTasks.length === 1 ? 'tarefa vencida' : 'tarefas vencidas'}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Priorize a resolução ou transfira a demanda caso precise de apoio da equipe.
            </div>
          </div>
        </div>
      </div>

      {lateTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Clock size={44} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--success)' }}>
            Nenhuma tarefa atrasada!
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            Todas as suas atividades estão em dia.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {sortedDates.map(date => {
            const dateTasks = groups[date]
            const daysLate = calculateDaysLate(date)

            return (
              <div key={date} className="card" style={{ padding: '16px 20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--danger)' }}>
                      📅 Vencida em {date.split('-').reverse().join('/')}
                    </span>
                    <span className="badge badge-danger">
                      {daysLate} {daysLate === 1 ? 'dia' : 'dias'} de atraso
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {dateTasks.length} {dateTasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dateTasks.map(task => {
                    const pop = pops.find(p => p.id === task.pop_id)

                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: 'var(--surface-alt)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => onCompleteTask(task.id)}
                            title="Concluir tarefa agora"
                          >
                            <Check size={13} />
                            Concluir
                          </button>

                          <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                            {task.title}
                          </span>

                          {pop && (
                            <button
                              onClick={() => onOpenPopDrawer(pop)}
                              className="badge badge-primary"
                              style={{ cursor: 'pointer', border: 'none' }}
                            >
                              <BookOpen size={11} />
                              POP: {pop.code}
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {task.assigned_to_name}
                          </span>

                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onOpenTransferTask(task)}
                            title="Transferir para outro colega"
                          >
                            <ArrowRightLeft size={13} />
                            Transferir
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
