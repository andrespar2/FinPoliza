import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Briefcase,
  CalendarClock,
  Car,
  Check,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Flower2,
  GraduationCap,
  HeartPulse,
  House,
  Inbox,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { EffectiveInstallmentStatus, PolicyStatus, UserStatus } from '../../types'
import { formatMoney } from '../../lib/format'
import { useAppState } from '../../hooks/useApp'

export function BackButton({ to, label = 'Atrás' }: { to?: string; label?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="icon-btn icon-btn--plain"
      aria-label={label}
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <ArrowLeft size={24} />
    </button>
  )
}

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  back?: boolean | string
  actions?: ReactNode
}

export function ScreenHeader({ title, subtitle, eyebrow, back, actions }: ScreenHeaderProps) {
  return (
    <header className="screen-head">
      {back && <BackButton to={typeof back === 'string' ? back : undefined} />}
      <div className="screen-head__body">
        {eyebrow && <div className="screen-head__eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row" style={{ gap: '0.45rem' }}>{actions}</div>}
    </header>
  )
}

export function SectionHeader({
  title,
  action,
  onAction,
  linkLabel = 'Ver todo',
}: {
  title: string
  action?: boolean
  onAction?: () => void
  linkLabel?: string
}) {
  return (
    <div className="section-head">
      <h2 className="section-title">{title}</h2>
      {action && (
        <button type="button" className="section-link" onClick={onAction}>
          {linkLabel}
        </button>
      )}
    </div>
  )
}

type BadgeTone = 'green' | 'red' | 'blue' | 'amber' | 'neutral' | 'gold'

export function Badge({
  tone = 'neutral',
  children,
  icon,
}: {
  tone?: BadgeTone
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon}
      {children}
    </span>
  )
}

const POLICY_LABEL: Record<PolicyStatus, string> = {
  active: 'Activo',
  overdue: 'En mora',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  const tone: BadgeTone =
    status === 'active' ? 'green' : status === 'overdue' ? 'red' : status === 'completed' ? 'blue' : 'neutral'
  return (
    <Badge tone={tone} icon={status === 'active' ? <BadgeCheck size={14} /> : undefined}>
      {POLICY_LABEL[status]}
    </Badge>
  )
}

const INSTALLMENT_LABEL: Record<EffectiveInstallmentStatus, string> = {
  paid: 'Pagada',
  pending: 'Pendiente',
  'due-soon': 'Por vencer',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
}

export function InstallmentStatusBadge({ status }: { status: EffectiveInstallmentStatus }) {
  const tone: BadgeTone =
    status === 'paid'
      ? 'green'
      : status === 'overdue'
        ? 'red'
        : status === 'due-soon'
          ? 'amber'
          : status === 'cancelled'
            ? 'neutral'
            : 'blue'
  return <Badge tone={tone}>{INSTALLMENT_LABEL[status]}</Badge>
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const label = status === 'active' ? 'Activa' : status === 'suspended' ? 'Suspendida' : 'Inactiva'
  const tone: BadgeTone = status === 'active' ? 'green' : status === 'suspended' ? 'red' : 'neutral'
  return (
    <Badge tone={tone} icon={status === 'active' ? <BadgeCheck size={14} /> : status === 'suspended' ? <Ban size={14} /> : undefined}>
      {label}
    </Badge>
  )
}

export function ProgressBar({ value, tone = 'blue', thin }: { value: number; tone?: 'blue' | 'green' | 'red'; thin?: boolean }) {
  return (
    <div
      className={`progress ${tone === 'green' ? 'progress--green' : tone === 'red' ? 'progress--red' : ''} ${thin ? 'progress--thin' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress__bar" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Money({ value, sign, className }: { value: number; sign?: boolean; className?: string }) {
  return <span className={`money ${className ?? ''}`}>{formatMoney(value, { sign })}</span>
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon ?? <Inbox size={26} />}</div>
      <h3 className="empty__title">{title}</h3>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  )
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="info-item">
      <span className="info-item__label">{label}</span>
      <span className="info-item__value">{value}</span>
    </div>
  )
}

const PRODUCT_ICONS: Record<string, typeof HeartPulse> = {
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  House,
  Car,
  Flower2,
  GraduationCap,
  PawPrint,
  Briefcase,
  Wallet,
  BadgeCheck,
  CircleDollarSign,
}

export function ProductIcon({
  name,
  color,
  size = 1.55,
}: {
  name: string
  color?: string
  size?: number
}) {
  const Icon = PRODUCT_ICONS[name] ?? ShieldCheck
  return (
    <span
      className="product-icon"
      style={{
        color: color ?? '#60a5fa',
        background: `${color ?? '#3b82f6'}18`,
        borderColor: `${color ?? '#3b82f6'}38`,
      }}
      aria-hidden="true"
    >
      <Icon size={size * 16} strokeWidth={1.9} />
    </span>
  )
}

export function LoadingScreen({ message = 'Cargando tu información…' }: { message?: string }) {
  return (
    <div className="splash">
      <BrandMark size="lg" />
      <div className="splash__spinner" aria-hidden="true" />
      <div>
        <p className="strong">{message}</p>
        <p className="tiny" style={{ marginTop: '0.3rem' }}>
          FinPoliza
        </p>
      </div>
    </div>
  )
}

export function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { settings } = useAppState()
  const [failed, setFailed] = useState(false)
  const logo = settings?.company?.logoUrl?.trim()
  return (
    <div className={`brand__mark ${size === 'lg' ? 'brand__mark--lg' : ''}`} aria-hidden="true">
      {logo && !failed ? (
        <img src={logo} alt="" className="brand__mark__img" onError={() => setFailed(true)} />
      ) : (
        'FP'
      )}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="splash">
      <div className="empty__icon" style={{ background: 'rgba(255,107,107,.12)', color: '#ff9a9a' }}>
        <CircleAlert size={28} />
      </div>
      <div>
        <h1 className="page-title" style={{ fontSize: '1.4rem' }}>
          Algo salió mal
        </h1>
        <p className="muted" style={{ marginTop: '0.5rem', maxWidth: '22rem' }}>
          {message}
        </p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function DemoDisclaimer() {
  const { settings } = useAppState()
  return (
    <div className="demo-note">
      <ShieldCheck size={17} style={{ flexShrink: 0, marginTop: '0.05rem' }} />
      <span>{settings.texts.demoDisclaimer}</span>
    </div>
  )
}

export function DueLabel({ date }: { date: string }) {
  const { settings } = useAppState()
  const reminderDays = settings.insurance.reminderDays
  const today = new Date()
  const [y, m, d] = date.split('-').map(Number)
  const due = new Date(y, (m ?? 1) - 1, d ?? 1)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((due.getTime() - todayMid.getTime()) / 86_400_000)
  if (diff < 0) {
    return (
      <span className="text-red strong" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <CircleAlert size={14} /> Vencida hace {Math.abs(diff)} {Math.abs(diff) === 1 ? 'día' : 'días'}
      </span>
    )
  }
  if (diff === 0) {
    return (
      <span className="text-amber strong" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <Clock3 size={14} /> Vence hoy
      </span>
    )
  }
  if (diff <= reminderDays) {
    return (
      <span className="text-amber strong" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        <CalendarClock size={14} /> Vence en {diff} {diff === 1 ? 'día' : 'días'}
      </span>
    )
  }
  return (
    <span className="dim" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <Clock3 size={14} /> Vence en {diff} días
    </span>
  )
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="check-list">
      {items.map((item) => (
        <li key={item} className="check-list__item">
          <Check size={17} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function PaymentMethodLabel({ method }: { method: string }) {
  const labels: Record<string, string> = {
    tarjeta_simulada: 'Tarjeta simulada',
    pse_simulado: 'PSE simulado',
    efectivo: 'Efectivo',
    transferencia_simulada: 'Transferencia simulada',
    credit_card: 'Tarjeta simulada',
  }
  return <span>{labels[method] ?? method}</span>
}

export function CreditCardIcon() {
  return <CreditCard size={18} />
}
