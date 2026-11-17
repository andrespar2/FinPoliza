/** Utilidades de formato con configuración global editable desde el panel admin. */

export interface FormatConfig {
  currency: string
  locale: string
  dateFormat: string
}

let config: FormatConfig = {
  currency: 'COP',
  locale: 'es-CO',
  dateFormat: 'dd/MM/yyyy',
}

export function configureFormat(next: Partial<FormatConfig>) {
  config = { ...config, ...next }
}

export function getFormatConfig(): FormatConfig {
  return config
}

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function formatMoney(
  value: number,
  opts: { sign?: boolean; decimals?: boolean; compact?: boolean } = {},
): string {
  const amount = safeNumber(value)
  const abs = Math.abs(amount)
  if (opts.compact && abs >= 1_000_000) {
    const millions = abs / 1_000_000
    const decimals = millions >= 10 ? 0 : 1
    const text = millions.toFixed(decimals).replace(',', '.').replace(/\.0$/, '').replace('.', ',')
    return `${amount < 0 ? '-' : ''}$ ${text} M`
  }
  const zeroDecimal = ['COP', 'CLP', 'PYG', 'CRC'].includes(config.currency.toUpperCase())
  const decimals = opts.decimals ?? !zeroDecimal
  let formatted: string
  try {
    formatted = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(abs)
  } catch {
    formatted = `$${abs.toLocaleString('es-CO', { maximumFractionDigits: decimals ? 2 : 0 })}`
  }
  const prefix = amount < 0 ? '-' : opts.sign && amount > 0 ? '+' : ''
  return `${prefix}${formatted}`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(config.locale || 'es-CO').format(safeNumber(value))
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim()
  if (!cleaned) return 0
  // Formato local: puntos de miles y coma decimal.
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/\.(?=\d{3}\b)/g, '')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

export function formatAmountInput(value: number): string {
  if (!value) return ''
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)
}

function parseDateValue(value: string): Date {
  if (value.length > 10) return new Date(value)
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDate(value: string, pattern?: string): string {
  if (!value) return '—'
  const d = parseDateValue(value)
  if (Number.isNaN(d.getTime())) return '—'
  const fmt = pattern ?? config.dateFormat
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  switch (fmt) {
    case 'MM/dd/yyyy':
      return `${mm}/${dd}/${yyyy}`
    case 'yyyy-MM-dd':
      return `${yyyy}-${mm}-${dd}`
    case 'd MMMM yyyy':
      return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${yyyy}`
    case 'dd MMM yyyy':
      return `${dd} ${MONTHS_ES[d.getMonth()].slice(0, 3)} ${yyyy}`
    case 'dd/MM/yyyy':
    default:
      return `${dd}/${mm}/${yyyy}`
  }
}

export function formatLongDate(value: string): string {
  return formatDate(value, 'd MMMM yyyy')
}

export function formatTime(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDate(value)} · ${formatTime(value)}`
}

export function monthShort(value: string): string {
  const d = parseDateValue(value)
  return MONTHS_ES[d.getMonth()]?.slice(0, 3) ?? ''
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim()
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return email
  const visible = user.slice(0, Math.min(2, user.length))
  return `${visible}${'•'.repeat(Math.max(2, user.length - 2))}@${domain}`
}

export function percent(value: number, total: number): number {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}
