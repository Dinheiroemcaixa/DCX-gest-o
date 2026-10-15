import React, { useState, useEffect } from 'react'
import type { Task, Profile, Pop, Priority, RecurType } from '../types'
import { useAuth } from '../context/AuthContext'
import { getProfiles, getPops } from '../lib/storage'
import { X, BookOpen, Plus, Trash2, CheckCircle2 } from 'lucide-react'

interface TaskModalProps {
  editTask?: Task | null
  onSave: (taskData: Partial<Task>) => void
  onClose: () => void
  defaultDate?: string
}

export const TaskModal: React.FC<TaskModalProps> = ({ editTask, onSave, onClose, defaultDate }) => {
  const { currentUser, isOperador } = useAuth()
  const profiles = getProfiles().filter(p => p.status === 'aprovado')
  const pops = getPops().filter(p => p.status === 'aprovado')

  const [title, setTitle] = useState(editTask?.title || '')
  const [description, setDescription] = useState(editTask?.description || '')
  
  // Se for operador, padrão é ele mesmo; gestora/proprietário podem escolher qualquer um
  const [assignedTo, setAssignedTo] = useState(
    editTask?.assigned_to || (isOperador ? currentUser?.id || '' : profiles[0]?.id || '')
  )

  const todayStr = new Date().toISOString().split('T')[0]
  const [dueDate, setDueDate] = useState(editTask?.due_date || defaultDate || todayStr)
  const [allDay, setAllDay] = useState(editTask?.all_day ?? true)
  const [startTime, setStartTime] = useState(editTask?.start_time || '09:00')
  const [endTime, setEndTime] = useState(editTask?.end_time || '10:00')
  const [priority, setPriority] = useState<Priority>(editTask?.priority || 'Media')
  const [recurrenceType, setRecurrenceType] = useState<RecurType>(editTask?.recurrence_type || 'none')
  const [popId, setPopId] = useState(editTask?.pop_id || '')
  
  // Subtarefas
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; is_completed: boolean; sort_order: number }[]>(
    editTask?.subtasks?.map(s => ({ ...s })) || []
  )
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  // Ao selecionar um POP, permite preencher o checklist automaticamente
  const handlePopChange = (selectedPopId: string) => {
    setPopId(selectedPopId)
    if (!selectedPopId) return

    const selectedPop = pops.find(p => p.id === selectedPopId)
    if (selectedPop?.active_version?.checklist && selectedPop.active_version.checklist.length > 0) {
      const confirmLoad = window.confirm(
        `Deseja importar as ${selectedPop.active_version.checklist.length} etapas do checklist do "${selectedPop.title}" para esta tarefa?`
      )
      if (confirmLoad) {
        const imported = selectedPop.active_version.checklist.map((item, idx) => ({
          id: 'sub_imported_' + Date.now() + '_' + idx,
          title: item,
          is_completed: false,
          sort_order: idx + 1
        }))
        setSubtasks(imported)
      }
    }
  }

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    setSubtasks([
      ...subtasks,
      {
        id: 'sub_' + Date.now(),
        title: newSubtaskTitle.trim(),
        is_completed: false,
        sort_order: subtasks.length + 1
      }
    ])
    setNewSubtaskTitle('')
  }

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Preencha a descrição da tarefa.')
      return
    }

    const assignedProfile = profiles.find(p => p.id === assignedTo)
    const selectedPop = pops.find(p => p.id === popId)

    const payload: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      assigned_to: assignedTo,
      assigned_to_name: assignedProfile?.name,
      assigned_to_color: assignedProfile?.avatar_color,
      due_date: dueDate,
      all_day: allDay,
      start_time: allDay ? undefined : startTime,
      end_time: allDay ? undefined : endTime,
      priority,
      recurrence_type: recurrenceType,
      pop_id: popId || undefined,
      pop_title: selectedPop?.title || undefined,
      pop_version: selectedPop?.current_version || undefined,
      subtasks: subtasks.map((s, idx) => ({
        id: s.id,
        task_id: editTask?.id || '',
        title: s.title,
        is_completed: s.is_completed,
        sort_order: idx + 1
      }))
    }

    onSave(payload)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title">
            {editTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-body" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* Título */}
            <div className="form-group">
              <label className="form-label">O que precisa ser feito? *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Conciliar fechamento de caixa do dia"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Linha com Responsável e Prioridade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Responsável pela Execução</label>
                <select
                  className="form-select"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={isOperador && !!editTask} // Operador altera o responsável via ação de transferência
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === currentUser?.id ? '(Você)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="Alta">Alta (Urgente)</option>
                  <option value="Media">Média (Padrão)</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
            </div>

            {/* Data e Horário */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Data de Vencimento</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recorrência</label>
                <select
                  className="form-select"
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value as RecurType)}
                >
                  <option value="none">Sem repetição (única)</option>
                  <option value="daily">Diária (todos os dias)</option>
                  <option value="weekdays">Dias úteis (Seg a Sex)</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
            </div>

            {/* Toggle Dia Todo / Horários */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: 'var(--surface-alt)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px'
            }}>
              <input
                type="checkbox"
                id="all_day_toggle"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="all_day_toggle" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                Dia todo (sem horário específico)
              </label>

              {!allDay && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="time"
                    className="form-input"
                    style={{ width: '90px', padding: '4px 8px' }}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>até</span>
                  <input
                    type="time"
                    className="form-input"
                    style={{ width: '90px', padding: '4px 8px' }}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Vínculo com POP (Diferencial do App) */}
            <div className="form-group" style={{
              border: '1px solid var(--primary-border)',
              backgroundColor: 'var(--primary-soft)',
              padding: '14px',
              borderRadius: 'var(--radius-md)'
            }}>
              <label className="form-label" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={16} />
                Procedimento Operacional Padrão (POP) Vinculado
              </label>
              <select
                className="form-select"
                value={popId}
                onChange={(e) => handlePopChange(e.target.value)}
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <option value="">Nenhum POP vinculado</option>
                {pops.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.title}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px' }}>
                Conecte um guia para orientar a execução ou treinar outro colega em caso de cobertura de férias.
              </div>
            </div>

            {/* Checklist de Subtarefas */}
            <div className="form-group">
              <label className="form-label">Checklist de Subtarefas ({subtasks.length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {subtasks.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      backgroundColor: 'var(--surface-alt)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', width: '16px' }}>{idx + 1}.</span>
                    <span style={{ flex: 1 }}>{s.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Adicionar item no checklist..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSubtask()
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddSubtask}
                >
                  <Plus size={15} />
                  Adicionar
                </button>
              </div>
            </div>

            {/* Observações */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observações e Detalhes</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Instruções complementares ou links de apoio..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editTask ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
