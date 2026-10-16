// Utilitário de datas com fuso horário local seguro (evita desvios UTC-3)

export function formatDateToIso(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDateStr(): string {
  return formatDateToIso(new Date())
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

export function formatDateBrShort(dateStr: string): string {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return dateStr
}

// 1. Esta semana: de segunda-feira a domingo da semana atual
export function getThisWeekRange(refDate: Date = new Date()): { start: string; end: string } {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const date = refDate.getDate()
  const current = new Date(year, month, date)
  const dayOfWeek = current.getDay() // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(year, month, date + diffToMonday)
  const sunday = new Date(year, month, date + diffToMonday + 6)
  return {
    start: formatDateToIso(monday),
    end: formatDateToIso(sunday)
  }
}

// 2. Este mês: do primeiro ao último dia do mês atual
export function getThisMonthRange(refDate: Date = new Date()): { start: string; end: string } {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return {
    start: formatDateToIso(firstDay),
    end: formatDateToIso(lastDay)
  }
}

// 3. Este ano: de 1º de janeiro a 31 de dezembro do ano atual
export function getThisYearRange(refDate: Date = new Date()): { start: string; end: string } {
  const year = refDate.getFullYear()
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  }
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function getMonthNameBr(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] || ''
}

export function isDateWithinInterval(targetDate: string, startDate: string, endDate: string): boolean {
  if (!targetDate || !startDate || !endDate) return false
  const min = startDate <= endDate ? startDate : endDate
  const max = startDate <= endDate ? endDate : startDate
  return targetDate >= min && targetDate <= max
}
