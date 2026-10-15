import React from 'react'
import type { ActivePage } from '../types'
import { useAuth } from '../context/AuthContext'
import { Search, Sun, Moon, Plus, ShieldAlert } from 'lucide-react'

interface TopbarProps {
  activePage: ActivePage
  onOpenNewTask: () => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}

const PAGE_METADATA: Record<ActivePage, { title: string; subtitle: string }> = {
  tasks: { title: 'Gestão de Tarefas', subtitle: 'Acompanhe e organize as rotinas diárias da equipe' },
  atrasadas: { title: 'Tarefas Atrasadas', subtitle: 'Atividades que ultrapassaram a data de vencimento' },
  history: { title: 'Histórico de Conclusões', subtitle: 'Rastreabilidade e métricas de tarefas finalizadas' },
  pops: { title: 'Biblioteca de POPs', subtitle: 'Procedimentos Operacionais Padrão e guias de execução' },
  team: { title: 'Colaboradores & Cobertura', subtitle: 'Visão de equipe e regras de substituição em férias' },
  meetings: { title: 'Reuniões & Alinhamentos', subtitle: 'Compromissos agendados e pautas internas' },
  messages: { title: 'Mensagens Diretas', subtitle: 'Comunicação ágil e segura entre operadores' },
  settings: { title: 'Configurações do Proprietário', subtitle: 'Aprovação de cadastros, controle de acessos e segurança' }
}

export const Topbar: React.FC<TopbarProps> = ({
  activePage,
  onOpenNewTask,
  theme,
  toggleTheme,
  searchQuery,
  setSearchQuery
}) => {
  const { isProprietario, isGestora, isOperador } = useAuth()
  const meta = PAGE_METADATA[activePage] || { title: 'Painel', subtitle: '' }

  return (
    <header style={{
      height: '68px',
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      flexShrink: 0,
      gap: '16px'
    }}>
      {/* Título e Subtítulo */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          {meta.title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {meta.subtitle}
        </p>
      </div>

      {/* Ações e Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Campo de Busca Rápida */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          width: '260px'
        }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar tarefas ou POPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--text-main)',
              width: '100%'
            }}
          />
        </div>

        {/* Alternador de Tema */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          style={{ width: '36px', height: '36px', padding: 0 }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Botão de Criação de Tarefa (disponível para todos os perfis autorizados) */}
        {activePage === 'tasks' && (
          <button className="btn btn-primary" onClick={onOpenNewTask}>
            <Plus size={16} />
            <span>Nova Tarefa</span>
          </button>
        )}
      </div>
    </header>
  )
}
