import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

export interface ToastMessage {
  id: string
  text: string
  type: 'success' | 'warn' | 'error' | 'info'
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="var(--success)" />
      case 'warn': return <AlertTriangle size={18} color="var(--warning)" />
      case 'error': return <XCircle size={18} color="var(--danger)" />
      default: return <Info size={18} color="var(--primary)" />
    }
  }

  const getBorderColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success': return 'var(--success-border)'
      case 'warn': return 'var(--warning-border)'
      case 'error': return 'var(--danger-border)'
      default: return 'var(--primary-border)'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 2000
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-main)',
            border: `1px solid ${getBorderColor(t.type)}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-md)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '280px',
            maxWidth: '420px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {getIcon(t.type)}
          <span style={{ flex: 1 }}>{t.text}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>✕</span>
        </div>
      ))}
    </div>
  )
}
