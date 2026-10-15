import React from 'react'
import type { ActivePage, Profile } from '../types'
import { useAuth } from '../context/AuthContext'
import { 
  CheckSquare, 
  Clock, 
  History, 
  BookOpen, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Briefcase, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react'

interface SidebarProps {
  activePage: ActivePage
  setActivePage: (page: ActivePage) => void
  lateTasksCount: number
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, lateTasksCount }) => {
  const { currentUser, profiles, isProprietario, isGestora, logout } = useAuth()

  // Contagem de usuários pendentes de aprovação (para o badge do proprietário)
  const pendingApprovalsCount = profiles.filter(p => p.status === 'pendente').length

  const getRoleBadge = () => {
    if (isProprietario) return <span className="badge badge-primary"><ShieldCheck size={12} /> Desenvolvedor</span>
    if (isGestora) return <span className="badge badge-warning"><Briefcase size={12} /> Gestora</span>
    return <span className="badge badge-neutral"><UserCheck size={12} /> Operador</span>
  }

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'var(--transition)'
    }}>
      {/* Topo / Marca */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--primary)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '18px',
          boxShadow: '0 2px 8px rgba(36, 99, 235, 0.35)'
        }}>
          P
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Pulse <span style={{ color: 'var(--primary)' }}>POPs</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Gestor de Tarefas & Guias
          </div>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 10px' }}>
          Principal
        </div>

        <button
          className={`btn ${activePage === 'tasks' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActivePage('tasks')}
          style={{ justifyContent: 'flex-start', padding: '9px 12px', width: '100%' }}
        >
          <CheckSquare size={17} />
          <span>Minhas Tarefas</span>
        </button>

        <button
          className={`btn ${activePage === 'atrasadas' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActivePage('atrasadas')}
          style={{ justifyContent: 'flex-start', padding: '9px 12px', width: '100%' }}
        >
          <Clock size={17} />
          <span style={{ flex: 1, textAlign: 'left' }}>Atrasadas</span>
          {lateTasksCount > 0 && (
            <span style={{
              backgroundColor: 'var(--danger)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-full)',
              padding: '1px 7px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {lateTasksCount}
            </span>
          )}
        </button>

        <button
          className={`btn ${activePage === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActivePage('history')}
          style={{ justifyContent: 'flex-start', padding: '9px 12px', width: '100%' }}
        >
          <History size={17} />
          <span>Histórico de Feitas</span>
        </button>

        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '14px 10px 6px' }}>
          Conhecimento & Equipe
        </div>

        <button
          className={`btn ${activePage === 'pops' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActivePage('pops')}
          style={{ justifyContent: 'flex-start', padding: '9px 12px', width: '100%' }}
        >
          <BookOpen size={17} />
          <span>Biblioteca de POPs</span>
        </button>

        <button
          className={`btn ${activePage === 'team' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActivePage('team')}
          style={{ justifyContent: 'flex-start', padding: '9px 12px', width: '100%' }}
        >
          <Users size={17} />
          <span>Colaboradores & Férias</span>
        </button>

        <button
          className={`btn ${activePage === 'meetings' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActivePage('meetings')}
          style={{ justifyContent: 'flex-start', padding: '9px 12px', width: '100%' }}
        >
          <Calendar size={17} />
          <span>Reuniões</span>
        </button>

        <button
          className={`btn ${activePage === 'messages' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActivePage('messages')}
          style={{ justifyContent: 'flex-start', padding: '9px 12px', width: '100%' }}
        >
          <MessageSquare size={17} />
          <span>Mensagens</span>
        </button>

        {/* CARD CONFIGURAÇÕES: EXCLUSIVO DO PROPRIETÁRIO */}
        {isProprietario && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '14px 10px 6px' }}>
              Gestão Exclusiva
            </div>

            <button
              className={`btn ${activePage === 'settings' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActivePage('settings')}
              style={{
                justifyContent: 'flex-start',
                padding: '9px 12px',
                width: '100%',
                backgroundColor: activePage === 'settings' ? 'var(--primary)' : 'var(--primary-soft)',
                color: activePage === 'settings' ? '#FFFFFF' : 'var(--primary)',
                border: '1px solid var(--primary-border)'
              }}
            >
              <Settings size={17} />
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>Configurações</span>
              {pendingApprovalsCount > 0 && (
                <span style={{
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-full)',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          </>
        )}
      </nav>



      {/* Perfil do Usuário Conectado */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: currentUser?.avatar_color || 'var(--primary)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '13px'
        }}>
          {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.role === 'proprietario' && (!currentUser?.name || currentUser?.name === 'Proprietário' || currentUser?.name === 'Proprietário do Sistema') ? 'Desenvolvedor' : currentUser?.name}
          </div>
          <div style={{ marginTop: '2px' }}>
            {getRoleBadge()}
          </div>
        </div>
        <button
          onClick={logout}
          title="Encerrar sessão"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '6px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
