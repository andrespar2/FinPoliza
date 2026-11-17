import { ChevronRight, CalendarDays, Layers } from 'lucide-react'
import type { PolicyComputed } from '../../types'
import { formatDate, formatMoney, percent } from '../../lib/format'
import { PolicyStatusBadge, ProductIcon, ProgressBar } from '../ui/common'

export function PolicyCard({
  computed,
  onClick,
}: {
  computed: PolicyComputed
  onClick: () => void
}) {
  const { policy, paidCount, progress, pendingCount, pendingAmount, nextDue } = computed
  const paidTotal = computed.paidAmount

  return (
    <button type="button" className="card card--interactive policy-card" onClick={onClick}>
      <div className="policy-card__top">
        <ProductIcon name={policy.snapshot.icon} color={policy.snapshot.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="policy-card__name">{policy.snapshot.name}</div>
          <div className="policy-card__meta">
            {policy.code} · {policy.modalityLabel}
          </div>
        </div>
        <PolicyStatusBadge status={computed.effectiveStatus} />
      </div>

      <div className="policy-card__stats">
        <div>
          <div className="policy-card__stat-label">Cuotas pagadas</div>
          <div className="policy-card__stat-value">
            {paidCount} de {policy.installmentsCount}
          </div>
        </div>
        <div>
          <div className="policy-card__stat-label">Saldo pendiente</div>
          <div className="policy-card__stat-value money">{formatMoney(pendingAmount)}</div>
        </div>
        <div>
          <div className="policy-card__stat-label">Próximo pago</div>
          <div className="policy-card__stat-value">{nextDue ? formatDate(nextDue.dueDate) : '—'}</div>
        </div>
      </div>

      <div style={{ marginTop: '0.9rem' }}>
        <div className="row row--between" style={{ marginBottom: '0.35rem' }}>
          <span className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Layers size={12} /> {pendingCount} {pendingCount === 1 ? 'cuota pendiente' : 'cuotas pendientes'}
          </span>
          <span className="tiny">
            {percent(progress, 100)}% · {formatMoney(paidTotal)} pagados
          </span>
        </div>
        <ProgressBar value={progress} tone={computed.overdueCount > 0 ? 'red' : 'green'} thin />
      </div>

      <div className="row row--between" style={{ marginTop: '0.75rem' }}>
        <span className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <CalendarDays size={12} /> Comprado el {formatDate(policy.purchasedAt)}
        </span>
        <span className="row" style={{ gap: '0.2rem', color: '#9ec5ff', fontSize: '0.84rem', fontWeight: 650 }}>
          Ver detalle <ChevronRight size={16} />
        </span>
      </div>
    </button>
  )
}
