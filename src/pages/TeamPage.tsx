import React from 'react'
import type { Task } from '../types'
import { useAuth } from '../context/AuthContext'
import { Users, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Briefcase } from 'lucide-react'

interface TeamPageProps {
  tasks: Task[]
}

export const TeamPage: React.FC<TeamPageProps> = ({ tasks }) => {
  const { profiles, currentUser } = useAuth()
  const activeProfiles = profiles.filter(p => p.status === 'aprovado')
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
          Colaboradores & Produtividade Operacional
        </h2>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          Acompanhamento transparente das cargas de trabalho da equipe e facilitação de cobertura de férias.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {activeProfiles.map(p => {
          const memberTasks = tasks.filter(t => t.assigned_to === p.id)
          const openCount = memberTasks.filter(t => t.status !== 'Concluida' && t.due_date >= todayStr).length
          const lateCount = memberTasks.filter(t => t.status !== 'Concluida' && t.due_date < todayStr).length
          const doneCount = memberTasks.filter(t => t.status === 'Concluida').length

          return (
            <div key={p.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: p.avatar_color || 'var(--primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '15px'
                }}>
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-main)' }}>
                    {p.name} {p.id === currentUser?.id ? '(Você)' : ''}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {p.role}
                  </div>
                </div>
              </div>

              {/* Estatísticas do Colaborador */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                textAlign: 'center',
                backgroundColor: 'var(--surface-alt)',
                padding: '12px 8px',
                borderRadius: 'var(--radius-md)'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{openCount}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Abertas</div>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--danger)' }}>{lateCount}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Atrasadas</div>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success)' }}>{doneCount}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Feitas</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
