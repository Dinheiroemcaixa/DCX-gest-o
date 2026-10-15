import React from 'react'
import type { Pop } from '../types'
import { X, BookOpen, Clock, AlertTriangle, CheckSquare, ShieldCheck } from 'lucide-react'

interface PopDrawerProps {
  pop: Pop
  onClose: () => void
}

export const PopDrawer: React.FC<PopDrawerProps> = ({ pop, onClose }) => {
  const version = pop.active_version

  return (
    <div className="drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer-content">
        {/* Cabeçalho da Gaveta */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary">{pop.code}</span>
              <span className="badge badge-success">Versão {pop.current_version}.0</span>
              <span className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {pop.estimated_minutes} min
              </span>
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>
              {pop.title}
            </h2>
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Instruções Passo a Passo */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Objetivo */}
          {version?.objective && (
            <div style={{
              backgroundColor: 'var(--primary-soft)',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '13px',
              color: 'var(--text-main)',
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                🎯 Objetivo do Procedimento:
              </div>
              {version.objective}
            </div>
          )}

          {/* Pré-requisitos */}
          {version?.prerequisites && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <strong>Pré-requisitos:</strong> {version.prerequisites}
            </div>
          )}

          {/* Passos do Procedimento */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} color="var(--primary)" />
              Passo a Passo de Execução
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {version?.steps?.map((step) => (
                <div
                  key={step.step_number}
                  style={{
                    backgroundColor: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      backgroundColor: 'var(--primary)',
                      color: '#FFFFFF',
                      width: '22px',
                      height: '22px',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800
                    }}>
                      {step.step_number}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
                      {step.title}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '6px' }}>
                    {step.instructions}
                  </p>

                  {step.caution_note && (
                    <div style={{
                      marginTop: '10px',
                      backgroundColor: 'var(--warning-soft)',
                      border: '1px solid var(--warning-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: 'var(--warning)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px'
                    }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span><strong>Ponto de Atenção:</strong> {step.caution_note}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Erros Frequentes e Soluções */}
          {version?.common_errors && version.common_errors.length > 0 && (
            <div style={{
              backgroundColor: 'var(--danger-soft)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--danger)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} />
                Erros Frequentes e Como Evitá-los
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {version.common_errors.map((err, i) => (
                  <div key={i} style={{ fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 700, color: 'var(--danger)' }}>❌ {err.error_title}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>💡 <strong>Solução:</strong> {err.how_to_avoid}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist de Conferência do POP */}
          {version?.checklist && version.checklist.length > 0 && (
            <div style={{
              backgroundColor: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={16} color="var(--success)" />
                Critérios de Validação / Checklist Oficial
              </h3>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {version.checklist.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Rodapé da Gaveta */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: 'var(--surface-alt)'
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  )
}
