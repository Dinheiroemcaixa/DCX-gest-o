import React, { useState } from 'react'
import type { Task, Profile, Pop } from '../types'
import { useAuth } from '../context/AuthContext'
import { getPops } from '../lib/storage'
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Briefcase, 
  ArrowRightLeft, 
  Edit3, 
  Trash2, 
  BookOpen, 
  Lock, 
  ChevronRight,
  UserCheck
} from 'lucide-react'

interface TeamPageProps {
  tasks: Task[]
  onOpenEditTask: (task: Task) => void
  onOpenTransferTask: (task: Task) => void
  onOpenPopDrawer: (pop: Pop) => void
  onCompleteTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}

export const TeamPage: React.FC<TeamPageProps> = ({
  tasks,
  onOpenEditTask,
  onOpenTransferTask,
  onOpenPopDrawer,
  onCompleteTask,
  onDeleteTask
}) => {
  const { profiles, currentUser, isProprietario, isGestora, isOperador } = useAuth()
  const pops = getPops()
  const todayStr = new Date().toISOString().split('T')[0]

  const activeProfiles = profiles.filter(p => p.status === 'aprovado')
  
  // Colaborador selecionado para acompanhamento gerencial detalhado
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [teamFilterStatus, setTeamFilterStatus] = useState<'all' | 'open' | 'late' | 'done'>('all')

  const selectedMember = activeProfiles.find(p => p.id === selectedMemberId)

  // 1. REGRA: Operador NÃO tem acesso à visão gerencial de tarefas de terceiros
  if (isOperador) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            Equipe de Trabalho
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Lista de contato dos colaboradores autorizados da empresa.
          </p>
        </div>

        {/* Alerta de Privacidade Operacional */}
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Lock size={20} color="var(--primary)" />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Por diretriz de privacidade e foco no trabalho pessoal, os operadores não possuem acesso gerencial às filas de tarefas privadas dos colegas de equipe.
          </div>
        </div>

        {/* Lista Informativa de Contatos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {activeProfiles.map(p => {
            const isSelf = p.id === currentUser?.id
            return (
              <div key={p.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: p.avatar_color || 'var(--primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}>
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                      {p.name} {isSelf && <span className="badge badge-neutral">Você</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {p.role} • {p.email}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 2. REGRA: Gestora e Proprietário possuem Visão Gerencial Completa
  const memberTasks = selectedMemberId ? tasks.filter(t => t.assigned_to === selectedMemberId) : []
  
  let displayedMemberTasks = memberTasks
  if (teamFilterStatus === 'open') {
    displayedMemberTasks = memberTasks.filter(t => t.status !== 'Concluida' && t.due_date >= todayStr)
  } else if (teamFilterStatus === 'late') {
    displayedMemberTasks = memberTasks.filter(t => t.status !== 'Concluida' && t.due_date < todayStr)
  } else if (teamFilterStatus === 'done') {
    displayedMemberTasks = memberTasks.filter(t => t.status === 'Concluida')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabeçalho Gerencial */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            Acompanhamento Gerencial da Equipe
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Consulte a distribuição de demandas, acompanhe o ritmo de entregas e redistribua tarefas quando necessário.
          </p>
        </div>

        <span className="badge badge-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
          {isProprietario ? 'Visão Integral do Desenvolvedor' : 'Visão Operacional da Gestora'}
        </span>
      </div>

      {/* Grade de Colaboradores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {activeProfiles.map(p => {
          const tList = tasks.filter(t => t.assigned_to === p.id)
          const open = tList.filter(t => t.status !== 'Concluida' && t.due_date >= todayStr).length
          const late = tList.filter(t => t.status !== 'Concluida' && t.due_date < todayStr).length
          const done = tList.filter(t => t.status === 'Concluida').length
          const isSelected = selectedMemberId === p.id

          return (
            <div
              key={p.id}
              className="card"
              style={{
                padding: '18px',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                boxShadow: isSelected ? '0 0 0 2px var(--primary-border)' : 'var(--shadow-sm)'
              }}
              onClick={() => setSelectedMemberId(isSelected ? null : p.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: p.avatar_color || 'var(--primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px'
                  }}>
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {p.role}
                    </div>
                  </div>
                </div>

                <ChevronRight size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
              </div>

              {/* Indicadores Rápidos do Colaborador */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary)' }}>{open}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Abertas</div>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--danger)' }}>{late}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Atraso</div>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--success)' }}>{done}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Feitas</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, marginTop: '10px', textAlign: 'center' }}>
                {isSelected ? 'Ocultar Tarefas ▲' : 'Consultar Tarefas do Membro ▼'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Painel de Tarefas do Colaborador Selecionado */}
      {selectedMember && (
        <div className="card" style={{ padding: '24px', borderTop: '4px solid var(--primary)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Tarefas de {selectedMember.name} ({memberTasks.length})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Área gerencial de acompanhamento e administração de demandas deste colaborador.
              </p>
            </div>

            {/* Filtros Internos do Membro */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'open', label: 'Em Aberto' },
                { id: 'late', label: 'Atrasadas' },
                { id: 'done', label: 'Concluídas' }
              ].map(f => (
                <button
                  key={f.id}
                  className={`btn btn-sm ${teamFilterStatus === f.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTeamFilterStatus(f.id as any)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listagem das Tarefas do Colaborador */}
          {displayedMemberTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ opacity: 0.35, margin: '0 auto 8px' }} />
              <div style={{ fontSize: '13px' }}>Nenhuma tarefa encontrada para este filtro.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayedMemberTasks.map(t => {
                const isLate = t.status !== 'Concluida' && t.due_date < todayStr
                const isDone = t.status === 'Concluida'
                const pop = pops.find(p => p.id === t.pop_id)

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: isLate ? 'var(--danger-soft)' : 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: 'var(--text-main)',
                          textDecoration: isDone ? 'line-through' : 'none'
                        }}>
                          {t.title}
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

                        <span className={`badge ${isDone ? 'badge-success' : isLate ? 'badge-danger' : 'badge-warning'}`}>
                          {isDone ? 'Concluída' : isLate ? 'Atrasada' : t.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📅 Vencimento: {t.due_date.split('-').reverse().join('/')}
                        {t.description && ` • ${t.description}`}
                      </div>
                    </div>

                    {/* Ações Gerenciais Permitidas para Gestora e Proprietário */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {!isDone && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => onCompleteTask(t.id)}
                          title="Concluir tarefa em nome da operação"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          Concluir
                        </button>
                      )}

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenTransferTask(t)}
                        title="Reatribuir / Transferir para outro colaborador"
                        style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--primary)' }}
                      >
                        <ArrowRightLeft size={13} />
                        Reatribuir
                      </button>

                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => onOpenEditTask(t)}
                        title="Editar tarefa"
                        style={{ padding: '4px 6px' }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => onDeleteTask(t.id)}
                        title="Excluir tarefa"
                        style={{ padding: '4px 6px', color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
