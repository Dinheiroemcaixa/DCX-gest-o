import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogIn, UserPlus, ShieldCheck, Briefcase, UserCheck, AlertCircle } from 'lucide-react'

export const LoginView: React.FC = () => {
  const { profiles, loginAs, requestSignUp } = useAuth()

  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const result = requestSignUp(name, email)
    if (result.success) {
      setMessage({ text: result.message, type: 'success' })
      setName('')
      setEmail('')
    } else {
      setMessage({ text: result.message, type: 'error' })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-app)',
      padding: '24px'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '36px' }}>
        {/* Logotipo e Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '22px',
            boxShadow: '0 4px 12px rgba(36, 99, 235, 0.35)',
            marginBottom: '12px'
          }}>
            P
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Pulse <span style={{ color: 'var(--primary)' }}>POPs</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Gestor de Tarefas Pessoais e Biblioteca de POPs
          </p>
        </div>

        {/* Abas: Entrar vs Solicitar Cadastro */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          backgroundColor: 'var(--surface-alt)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            className={`btn ${tab === 'login' ? 'btn-secondary' : 'btn-ghost'} btn-sm`}
            style={{ fontWeight: 700 }}
            onClick={() => { setTab('login'); setMessage(null); }}
          >
            Acessar Sistema
          </button>
          <button
            type="button"
            className={`btn ${tab === 'signup' ? 'btn-secondary' : 'btn-ghost'} btn-sm`}
            style={{ fontWeight: 700 }}
            onClick={() => { setTab('signup'); setMessage(null); }}
          >
            Solicitar Cadastro
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12.5px',
            marginBottom: '18px',
            backgroundColor: message.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`
          }}>
            {message.text}
          </div>
        )}

        {/* ABA LOGIN: Acesso Rápido com Seleção de Contas de Teste */}
        {tab === 'login' ? (
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Selecione seu usuário para entrar:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profiles.map(p => {
                const isProp = p.role === 'proprietario'
                const isGest = p.role === 'gestora'

                return (
                  <button
                    key={p.id}
                    onClick={() => loginAs(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      backgroundColor: 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-alt)'}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: p.avatar_color || 'var(--primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0
                    }}>
                      {p.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.email}
                      </div>
                    </div>
                    <span className={`badge ${isProp ? 'badge-primary' : isGest ? 'badge-warning' : p.status === 'pendente' ? 'badge-danger' : 'badge-neutral'}`}>
                      {p.status === 'pendente' ? 'Pendente' : p.role.toUpperCase()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          /* ABA SOLICITAR CADASTRO */
          <form onSubmit={handleSignUpSubmit}>
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Lucas Mendes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail Corporativo *</label>
              <input
                type="email"
                className="form-input"
                placeholder="lucas@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{
              backgroundColor: 'var(--warning-soft)',
              border: '1px solid var(--warning-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--warning)',
              marginBottom: '18px',
              display: 'flex',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Atenção:</strong> Sua solicitação passará pela aprovação do <strong>Proprietário do Sistema</strong> antes de você ter acesso às tarefas.
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <UserPlus size={16} />
              Enviar Solicitação de Cadastro
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
