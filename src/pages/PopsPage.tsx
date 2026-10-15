import React, { useState } from 'react'
import type { Pop, PopCategory } from '../types'
import { useAuth } from '../context/AuthContext'
import { getPops, getPopCategories } from '../lib/storage'
import { BookOpen, Plus, Search, Clock, CheckCircle2, AlertTriangle, Layers } from 'lucide-react'

interface PopsPageProps {
  onOpenPopDrawer: (pop: Pop) => void
}

export const PopsPage: React.FC<PopsPageProps> = ({ onOpenPopDrawer }) => {
  const { isProprietario, isGestora } = useAuth()
  const pops = getPops()
  const categories = getPopCategories()

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  let filtered = [...pops]
  if (selectedCategory !== 'all') {
    filtered = filtered.filter(p => p.category_id === selectedCategory)
  }
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.code.toLowerCase().includes(q) ||
      (p.active_version?.objective && p.active_version.objective.toLowerCase().includes(q))
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Topo da Biblioteca */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            Biblioteca de Procedimentos Operacionais Padrão
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Manuais didáticos, checklists de conferência e orientações para execução segura e cobertura de férias.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => alert('O criador de rascunhos de POPs será expandido na Etapa 4.')}
        >
          <Plus size={16} />
          Criar Rascunho de POP
        </button>
      </div>

      {/* Categorias e Busca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedCategory('all')}
        >
          Todas as Categorias
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`btn btn-sm ${selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory(c.id)}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Grade de Cards de POPs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {filtered.map(pop => (
          <div
            key={pop.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              borderTop: '3px solid var(--primary)'
            }}
            onClick={() => onOpenPopDrawer(pop)}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-primary">{pop.code}</span>
                <span className="badge badge-success">Versão {pop.current_version}.0 (Oficial)</span>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.4 }}>
                {pop.title}
              </h3>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                {pop.active_version?.objective || 'Procedimento operacional para padronização da equipe.'}
              </p>
            </div>

            <div style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: 'var(--text-muted)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> {pop.estimated_minutes} min
              </span>

              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Visualizar Instruções →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
