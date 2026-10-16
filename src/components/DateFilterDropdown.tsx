import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check, ArrowRight } from 'lucide-react'
import {
  formatDateBr,
  formatDateBrShort,
  getThisWeekRange,
  getThisMonthRange,
  getThisYearRange,
  getMonthNameBr
} from '../lib/dateUtils'

export type DateFilterPeriod = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'

interface DateFilterDropdownProps {
  period: DateFilterPeriod
  startDate: string
  endDate: string
  todayStr: string
  onSelectPeriod: (period: DateFilterPeriod, customStart?: string, customEnd?: string) => void
}

export const DateFilterDropdown: React.FC<DateFilterDropdownProps> = ({
  period,
  startDate,
  endDate,
  todayStr,
  onSelectPeriod
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Estado local para período personalizado dentro do seletor
  const [customStart, setCustomStart] = useState(startDate)
  const [customEnd, setCustomEnd] = useState(endDate)
  const [showCustomInputs, setShowCustomInputs] = useState(period === 'custom')

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Manter inputs sincronizados com as props
  useEffect(() => {
    setCustomStart(startDate)
    setCustomEnd(endDate)
    setShowCustomInputs(period === 'custom')
  }, [startDate, endDate, period])

  // Rótulo compacto para o botão fechado
  const getButtonLabel = (): string => {
    if (period === 'today') {
      return formatDateBr(todayStr)
    }
    if (period === 'this_week') {
      return `Esta semana (${formatDateBrShort(startDate)} a ${formatDateBrShort(endDate)})`
    }
    if (period === 'this_month') {
      const now = new Date()
      return `Este mês (${getMonthNameBr(now.getMonth())})`
    }
    if (period === 'this_year') {
      const now = new Date()
      return `Este ano (${now.getFullYear()})`
    }
    if (period === 'custom') {
      return `${formatDateBrShort(startDate)} a ${formatDateBrShort(endDate)}`
    }
    return formatDateBr(todayStr)
  }

  const handleSelectOption = (opt: DateFilterPeriod) => {
    if (opt === 'custom') {
      setShowCustomInputs(true)
      return
    }
    setShowCustomInputs(false)
    setIsOpen(false)

    if (opt === 'today') {
      onSelectPeriod('today', todayStr, todayStr)
    } else if (opt === 'this_week') {
      const week = getThisWeekRange()
      onSelectPeriod('this_week', week.start, week.end)
    } else if (opt === 'this_month') {
      const month = getThisMonthRange()
      onSelectPeriod('this_month', month.start, month.end)
    } else if (opt === 'this_year') {
      const year = getThisYearRange()
      onSelectPeriod('this_year', year.start, year.end)
    }
  }

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return
    const min = customStart <= customEnd ? customStart : customEnd
    const max = customStart <= customEnd ? customEnd : customStart
    onSelectPeriod('custom', min, max)
    setIsOpen(false)
  }

  // Resumo das datas dos períodos para exibir no menu
  const weekRange = getThisWeekRange()
  const monthRange = getThisMonthRange()
  const yearRange = getThisYearRange()

  const options: Array<{ id: DateFilterPeriod; label: string; sublabel: string }> = [
    {
      id: 'today',
      label: 'Hoje',
      sublabel: formatDateBr(todayStr)
    },
    {
      id: 'this_week',
      label: 'Esta semana',
      sublabel: `${formatDateBrShort(weekRange.start)} a ${formatDateBrShort(weekRange.end)} (seg a dom)`
    },
    {
      id: 'this_month',
      label: 'Este mês',
      sublabel: `${formatDateBrShort(monthRange.start)} a ${formatDateBrShort(monthRange.end)}`
    },
    {
      id: 'this_year',
      label: 'Este ano',
      sublabel: `${formatDateBrShort(yearRange.start)} a ${formatDateBrShort(yearRange.end)}`
    },
    {
      id: 'custom',
      label: 'Período personalizado',
      sublabel: 'Escolher data inicial e final'
    }
  ]

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botão Compacto */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="btn btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: isOpen ? 'var(--surface-alt)' : 'var(--surface)',
          borderColor: isOpen ? 'var(--primary)' : 'var(--border)',
          color: 'var(--text-main)',
          boxShadow: 'var(--shadow-sm)'
        }}
        title="Filtrar por período"
      >
        <Calendar size={14} color="var(--primary)" />
        <span style={{ fontWeight: 700 }}>{getButtonLabel()}</span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease'
          }}
        />
      </button>

      {/* Menu Suspenso (Dropdown Popover) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            width: '290px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 6px 12px -4px rgba(0, 0, 0, 0.08)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{
            padding: '6px 10px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-muted)'
          }}>
            Selecionar Período
          </div>

          {options.map(opt => {
            const isSelected = period === opt.id

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--primary-soft)' : 'transparent',
                  border: isSelected ? '1px solid var(--primary-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-alt)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'var(--primary)' : 'var(--text-main)'
                  }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {opt.sublabel}
                  </div>
                </div>

                {isSelected && (
                  <Check size={16} color="var(--primary)" style={{ flexShrink: 0, marginLeft: '8px' }} />
                )}
              </button>
            )
          })}

          {/* Painel Embutido de Período Personalizado */}
          {showCustomInputs && (
            <div style={{
              marginTop: '6px',
              padding: '10px',
              backgroundColor: 'var(--surface-alt)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Intervalo personalizado:
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>De:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    style={{ width: '100%', padding: '5px 6px', fontSize: '12px' }}
                  />
                </div>
                <div style={{ paddingTop: '14px', color: 'var(--text-muted)' }}>
                  <ArrowRight size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Até:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    style={{ width: '100%', padding: '5px 6px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleApplyCustom}
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px', fontWeight: 700 }}
              >
                Aplicar Período
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
