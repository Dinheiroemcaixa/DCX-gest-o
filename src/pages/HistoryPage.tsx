import React, { useState } from 'react'
import type { Task } from '../types'
import { useAuth } from '../context/AuthContext'
import { History, RotateCcw, CheckCircle2, Search, Calendar, UserCheck } from 'lucide-react'

interface HistoryPageProps {
  tasks: Task[]
  onReopenTask: (taskId: string) => void
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ tasks, onReopenTask }) => {
  const { currentUser, isOperador } = useAuth()
  const [filterPeriod, setFilterPeriod] = useState<number>(30) // dias
  const [search, setSearch] = useState('')

  // Regra Pessoal Aprovada: Cada usuário autenticado vê exclusivamente o SEU histórico pessoal
  let completed = tasks.filter(t => t.status === 'Concluida' && (t.assigned_to === currentUser?.id || t.completed_by === currentUser?.id))

  // Filtro de busca
  if (search.trim()) {
    const q = search.toLowerCase()
    completed = completed.filter(t => t.title.toLowerCase().includes(q))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Topo com Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Concluídas</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
            {completed.length}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Taxa no Prazo</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
            94%
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Reaberturas Históricas</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--warning)', marginTop: '4px' }}>
            {tasks.filter(t => t.reopened_at).length}
          </div>
        </div>
      </div>

      {/* Lista de Concluídas com Botão de Reabertura */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              Registro de Atividades Finalizadas
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Auditoria permanente de conclusões. Ao reabrir, apenas a ocorrência pontual retorna à fila ativa.
            </p>
          </div>

          <input
            type="text"
            className="form-input"
            style={{ width: '220px', padding: '6px 12px' }}
            placeholder="Filtrar histórico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {completed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <History size={40} style={{ opacity: 0.35, margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Nenhuma tarefa concluída encontrada</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completed.map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface-alt)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)', textDecoration: 'line-through' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Concluída por <strong>{t.completed_by_name || t.assigned_to_name}</strong> em {t.completed_at ? new Date(t.completed_at).toLocaleString('pt-BR') : 'Data não informada'}
                    </div>
                  </div>
                </div>

                {/* Ação de Reabertura (Conforme decisão aprovada) */}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onReopenTask(t.id)}
                  title="Reabre somente esta ocorrência de volta para a fila de trabalho ativa"
                >
                  <RotateCcw size={13} color="var(--primary)" />
                  Reabrir Tarefa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
