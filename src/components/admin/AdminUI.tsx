import type { ReactNode } from 'react'
import { Search, ShieldAlert } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { hasPermission } from '../../services/store'
import { BackButton, EmptyState } from '../ui/common'

export function AdminHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  back?: string | boolean
}) {
  return (
    <div className="admin-head">
      {back && <BackButton to={typeof back === 'string' ? back : undefined} />}
      <div style={{ flex: 1, minWidth: '12rem' }}>
        <h1 className="admin-title">{title}</h1>
        {subtitle && <p className="admin-sub">{subtitle}</p>}
      </div>
      {actions && <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function NoPermission({ permission }: { permission: string }) {
  const { session } = useAppState()
  const allowed = hasPermission(session, permission)
  if (allowed) return null
  return (
    <EmptyState
      icon={<ShieldAlert size={26} />}
      title="No tienes permisos para esta sección"
      text="Tu rol no incluye acceso a esta información. Si necesitas acceso, solicítalo al administrador principal."
    />
  )
}

export function AdminSearch({
  value,
  onChange,
  placeholder = 'Buscar…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="search">
      <Search size={18} className="search__icon" />
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        inputMode="search"
      />
    </div>
  )
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="chip-row" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.15rem', maxWidth: '100%' }}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`chip chip--button chip--sm ${value === option.key ? 'chip--active' : ''}`}
          onClick={() => onChange(option.key)}
        >
          {option.label}
          {option.count !== undefined ? ` · ${option.count}` : ''}
        </button>
      ))}
    </div>
  )
}

export function AdminSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
