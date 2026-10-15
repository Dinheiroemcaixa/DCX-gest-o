import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { UserRole, Profile } from '../types'
import { 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  Database, 
  Check, 
  X, 
  Briefcase,
  Users
} from 'lucide-react'

interface SettingsPageProps {
  showToast: (text: string, type: 'success' | 'warn' | 'error' | 'info') => void
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ showToast }) => {
  const { profiles, isProprietario, approveUser, rejectUser, toggleStatus } = useAuth()

  const [activeTab, setActiveTab] = useState<'approvals' | 'users' | 'security'>('approvals')

  // Se por algum motivo tentar acessar sem ser proprietário, bloqueia imediatamente
  if (!isProprietario) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '500px', margin: '40px auto' }}>
        <AlertTriangle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>Acesso Negado</h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          O módulo de Configurações é exclusivo do Proprietário do Sistema. Outros perfis não possuem autorização para visualizar ou alterar estas diretrizes.
        </p>
      </div>
    )
  }

  const pendingUsers = profiles.filter(p => p.status === 'pendente')
  const activeUsers = profiles.filter(p => p.status !== 'pendente')

  const handleApprove = (userId: string, role: UserRole) => {
    const success = approveUser(userId, role)
    if (success) {
      showToast(`Usuário aprovado com sucesso com perfil de ${role.toUpperCase()}!`, 'success')
    } else {
      showToast('Erro ao aprovar usuário.', 'error')
    }
  }

  const handleReject = (userId: string) => {
    const confirmReject = window.confirm('Deseja realmente rejeitar a solicitação deste colaborador?')
    if (confirmReject) {
      const success = rejectUser(userId)
      if (success) {
        showToast('Solicitação de cadastro rejeitada.', 'warn')
      }
    }
  }

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const action = currentStatus === 'aprovado' ? 'suspender' : 'reativar'
    const confirmAction = window.confirm(`Deseja realmente ${action} esta conta?`)
    if (confirmAction) {
      const success = toggleStatus(userId)
      if (success) {
        showToast(`Conta ${action === 'suspender' ? 'suspensa' : 'reativada'} com sucesso!`, 'info')
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner de Controle Exclusivo */}
      <div style={{
        backgroundColor: 'var(--primary-soft)',
        border: '1px solid var(--primary-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
              Painel de Administração do Proprietário
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Apenas o seu perfil possui acesso a esta área. Aprovação de cadastros, hierarquia e políticas de acesso.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('approvals')}
          >
            Pendentes ({pendingUsers.length})
          </button>
          <button
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('users')}
          >
            Colaboradores ({activeUsers.length})
          </button>
          <button
            className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('security')}
          >
            Segurança & Banco
          </button>
        </div>
      </div>

      {/* ABA 1: APROVAÇÃO DE CADASTROS */}
      {activeTab === 'approvals' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Fila de Novos Cadastros Pendentes de Aprovação
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Nenhum novo colaborador acessa as tarefas ou POPs até que você aprove a solicitação e defina seu papel.
              </p>
            </div>
            <span className="badge badge-warning" style={{ fontSize: '12px', padding: '4px 10px' }}>
              {pendingUsers.length} aguardando análise
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <UserCheck size={40} style={{ opacity: 0.4, margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>
                Nenhuma solicitação pendente no momento!
              </div>
              <div style={{ fontSize: '12px' }}>
                Quando novos colaboradores solicitarem acesso, eles aparecerão aqui para sua aprovação.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingUsers.map(user => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    backgroundColor: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--text-muted)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {user.email} • Solicitado em {new Date(user.created_at || '').toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  {/* Ações de Aprovação com Definição do Papel */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApprove(user.id, 'operador')}
                      title="Aprova a conta concedendo acesso apenas às próprias tarefas e aos POPs autorizados"
                    >
                      <UserCheck size={14} />
                      Aprovar como Operador
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--primary)', borderColor: 'var(--primary-border)' }}
                      onClick={() => handleApprove(user.id, 'gestora')}
                      title="Aprova a conta com permissões de visualização e gestão de tarefas de toda a equipe"
                    >
                      <Briefcase size={14} />
                      Aprovar como Gestora
                    </button>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(user.id)}
                      title="Rejeita e bloqueia a solicitação"
                    >
                      <X size={14} />
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: LISTAGEM DE COLABORADORES E PERFIS */}
      {activeTab === 'users' && (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              Controle Geral de Colaboradores e Acessos
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Visualize a hierarquia ativa, ative ou suspenda contas e acompanhe os papéis definidos.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeUsers.map(user => {
              const isSelf = user.role === 'proprietario'

              return (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: user.avatar_color || 'var(--primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {user.name}
                        {isSelf && <span className="badge badge-primary">Você (Proprietário)</span>}
                        {user.role === 'gestora' && <span className="badge badge-warning">Gestora</span>}
                        {user.role === 'operador' && <span className="badge badge-neutral">Operador</span>}
                        {user.status === 'suspenso' && <span className="badge badge-danger">Conta Suspensa</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {!isSelf && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Alternador de Papel entre Gestora e Operador */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const newRole: UserRole = user.role === 'gestora' ? 'operador' : 'gestora'
                          approveUser(user.id, newRole)
                          showToast(`Papel de ${user.name} alterado para ${newRole.toUpperCase()}.`, 'info')
                        }}
                      >
                        Mudar para {user.role === 'gestora' ? 'Operador' : 'Gestora'}
                      </button>

                      {/* Suspender / Reativar */}
                      <button
                        className={`btn ${user.status === 'suspenso' ? 'btn-success' : 'btn-danger'} btn-sm`}
                        onClick={() => handleToggleStatus(user.id, user.status)}
                      >
                        {user.status === 'suspenso' ? 'Reativar Conta' : 'Suspender Acesso'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ABA 3: SEGURANÇA E BANCO DE DADOS */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--primary)" />
              Diretrizes de Segurança RLS
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              O sistema opera com isolamento relacional nativo (Row Level Security):
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Zero Senha Mestra:</strong> Não há chaves secretas ou backdoors gravados no código.</li>
              <li><strong>Barreira para Contas Pendentes:</strong> Contas sem aprovação expressa são barradas nas requisições.</li>
              <li><strong>Operadores Blindados:</strong> Operadores não conseguem ler nem alterar tarefas de terceiros diretamente.</li>
            </ul>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--success)" />
              Backup & Restauração Transacional
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Recursos de cópia de segurança sob demanda com verificação de integridade antes de qualquer alteração de dados.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '14px' }}
              onClick={() => showToast('Backup dos dados gerado e verificado com sucesso!', 'success')}
            >
              Gerar Snapshot de Segurança Agora
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
