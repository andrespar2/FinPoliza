import type { ISODate, ISODateTime, Periodicity } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha local en formato YYYY-MM-DD (sin desfase por zona horaria). */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function nowISO(): ISODateTime {
  return new Date().toISOString()
}

/** Convierte YYYY-MM-DD o un ISO completo en Date local a medianoche. */
export function parseISODate(value: ISODate | ISODateTime): Date {
  if (value.length > 10) {
    const d = new Date(value)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(value: ISODate, days: number): ISODate {
  const d = parseISODate(value)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function addMonths(value: ISODate, months: number): ISODate {
  const d = parseISODate(value)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toISODate(d)
}

export function addPeriod(value: ISODate, periodicity: Periodicity, times = 1): ISODate {
  switch (periodicity) {
    case 'weekly':
      return addDays(value, 7 * times)
    case 'biweekly':
      return addDays(value, 15 * times)
    case 'annual':
      return addMonths(value, 12 * times)
    case 'monthly':
    default:
      return addMonths(value, times)
  }
}

export function diffInDays(from: ISODate, to: ISODate): number {
  const a = parseISODate(from).getTime()
  const b = parseISODate(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function daysFromToday(date: ISODate): number {
  return diffInDays(todayISO(), date)
}

export function isPast(date: ISODate): boolean {
  return diffInDays(date, todayISO()) > 0
}

export function startOfMonth(value: ISODate = todayISO()): ISODate {
  const d = parseISODate(value)
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function endOfMonth(value: ISODate = todayISO()): ISODate {
  const d = parseISODate(value)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/** Límites de un período de análisis para filtros de dashboard. */
export function periodRange(period: 'month' | 'quarter' | 'year' | 'all'): { from: ISODate; to: ISODate } {
  const today = todayISO()
  const d = parseISODate(today)
  switch (period) {
    case 'quarter': {
      const qStartMonth = Math.floor(d.getMonth() / 3) * 3
      const from = toISODate(new Date(d.getFullYear(), qStartMonth, 1))
      const to = toISODate(new Date(d.getFullYear(), qStartMonth + 3, 0))
      return { from, to }
    }
    case 'year':
      return { from: toISODate(new Date(d.getFullYear(), 0, 1)), to: toISODate(new Date(d.getFullYear(), 11, 31)) }
    case 'all':
      return { from: '2000-01-01', to: '2100-12-31' }
    case 'month':
    default:
      return { from: startOfMonth(today), to: endOfMonth(today) }
  }
}

/** Últimos n meses (incluyendo el actual), para gráficos. */
export function lastMonths(n: number): { key: string; label: string; from: ISODate; to: ISODate }[] {
  const today = parseISODate(todayISO())
  const out: { key: string; label: string; from: ISODate; to: ISODate }[] = []
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  for (let i = n - 1; i >= 0; i -= 1) {
    const first = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const last = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)
    out.push({
      key: `${first.getFullYear()}-${pad(first.getMonth() + 1)}`,
      label: monthNames[first.getMonth()],
      from: toISODate(first),
      to: toISODate(last),
    })
  }
  return out
}

export function timeFromISO(iso: ISODateTime): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
