import React, { useState } from 'react'
import type { Task, Profile } from '../types'
import { useAuth } from '../context/AuthContext'
import { getProfiles } from '../lib/storage'
import { ArrowRightLeft, X, AlertCircle } from 'lucide-react'

interface TransferModalProps {
  task: Task
  onConfirm: (newAssignedId: string, reason: string) => void
  onClose: () => void
}

export const TransferModal: React.FC<TransferModalProps> = ({ task, onConfirm, onClose }) => {
  const { currentUser } = useAuth()
  const profiles = getProfiles().filter(p => p.status === 'aprovado' && p.id !== task.assigned_to)

  const [newAssignedId, setNewAssignedId] = useState(profiles[0]?.id || '')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAssignedId) {
      alert('Selecione o novo responsável.')
      return
    }
    if (!reason.trim()) {
      alert('Por favor, informe uma breve justificativa para a transferência.')
      return
    }
    onConfirm(newAssignedId, reason.trim())
  }

  const currentResponsible = getProfiles().find(p => p.id === task.assigned_to)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} color="var(--primary)" />
            Transferir Responsabilidade da Tarefa
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{
              backgroundColor: 'var(--surface-alt)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Tarefa:</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {task.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Responsável atual: <strong>{currentResponsible?.name || 'Não definido'}</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Transferir para qual colaborador? *</label>
              <select
                className="form-select"
                value={newAssignedId}
                onChange={(e) => setNewAssignedId(e.target.value)}
                required
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Motivo da Transferência *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Ex: Tarefa repassada devido a ausência / redistribuição de demandas..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} />
                Esta ação será registrada no histórico de auditoria com data e autor.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Confirmar Transferência
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
