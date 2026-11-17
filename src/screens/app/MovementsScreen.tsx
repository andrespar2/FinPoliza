import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Filter, ReceiptText } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { movementsForUser } from '../../services/selectors'
import { formatDate, formatDateTime, formatMoney } from '../../lib/format'
import { EmptyState, InfoRow, ScreenHeader } from '../../components/ui/common'
import { MovementRow } from '../../components/app/MovementRow'
import { Sheet } from '../../components/ui/Sheet'
import type { MovementView } from '../../types'
import { addMonths, todayISO } from '../../lib/dates'
import { PaymentMethodLabel } from '../../components/ui/common'

type TypeFilter = 'all' | 'payment' | 'deposit' | 'withdrawal' | 'adjustment'
type PeriodFilter = 'month' | 'quarter' | 'year' | 'all'

export function MovementsScreen() {
  const state = useAppState()
  const session = state.session!
  const [type, setType] = useState<TypeFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('month')
  const [detail, setDetail] = useState<MovementView | null>(null)

  const movements = useMemo(() => movementsForUser(state, session.id), [state, session.id])

  const from = useMemo(() => {
    const today = todayISO()
    if (period === 'month') return today.slice(0, 8) + '01'
    if (period === 'quarter') return addMonths(today, -3)
    if (period === 'year') return `${today.slice(0, 4)}-01-01`
    return '2000-01-01'
  }, [period])

  const filtered = movements.filter((m) => {
    if (m.date < from) return false
    if (type === 'all') return true
    if (type === 'payment') return m.source === 'payment'
    if (type === 'deposit') return m.fundType === 'deposit'
    if (type === 'withdrawal') return m.fundType === 'withdrawal'
    return m.fundType === 'adjustment_credit' || m.fundType === 'adjustment_debit'
  })

  const totals = filtered.reduce(
    (acc, m) => {
      if (m.source === 'payment') acc.payments += m.amount
      else if (m.fundType === 'deposit' || m.fundType === 'adjustment_credit') acc.in += m.amount
      else acc.out += m.amount
      return acc
    },
    { payments: 0, in: 0, out: 0 },
  )

  const types: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'payment', label: 'Pagos' },
    { key: 'deposit', label: 'Aportaciones' },
    { key: 'withdrawal', label: 'Retiros' },
    { key: 'adjustment', label: 'Ajustes' },
  ]

  const periods: { key: PeriodFilter; label: string }[] = [
    { key: 'month', label: 'Este mes' },
    { key: 'quarter', label: '3 meses' },
    { key: 'year', label: 'Este año' },
    { key: 'all', label: 'Todo' },
  ]

  return (
    <div className="page">
      <ScreenHeader title="Movimientos" subtitle="Todos tus pagos y operaciones del fondo solidario." />

      <div className="grid grid--3-md" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="stat">
          <span className="stat__label">Pagos de seguros</span>
          <span className="stat__value money" style={{ fontSize: '1.02rem' }}>
            {formatMoney(totals.payments)}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Aportes al fondo</span>
          <span className="stat__value money text-green" style={{ fontSize: '1.02rem' }}>
            {formatMoney(totals.in)}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Retiros del fondo</span>
          <span className="stat__value money" style={{ fontSize: '1.02rem' }}>
            {formatMoney(totals.out)}
          </span>
        </div>
      </div>

      <div className="stack stack--sm" style={{ marginBottom: '1rem' }}>
        <div className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
          <Filter size={15} className="dim" />
          <span className="tiny" style={{ fontWeight: 700 }}>
            Filtrar por tipo
          </span>
        </div>
        <div className="chip-row" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.15rem' }}>
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`chip chip--button chip--sm ${type === t.key ? 'chip--active' : ''}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="chip-row" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.15rem' }}>
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`chip chip--button chip--sm ${period === p.key ? 'chip--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={26} />}
          title="No hay movimientos en este filtro"
          text="Prueba con otro período o tipo de operación."
        />
      ) : (
        <>
          <div className="list">
            {filtered.map((movement) => (
              <MovementRow key={movement.id} movement={movement} onClick={() => setDetail(movement)} />
            ))}
          </div>
          <p className="tiny center" style={{ marginTop: '0.8rem' }}>
            Mostrando {filtered.length} de {movements.length} movimientos
          </p>
        </>
      )}

      <Sheet open={!!detail} onClose={() => setDetail(null)} title="Detalle del movimiento">
        {detail && (
          <div className="stack">
            <div
              className="card"
              style={{
                textAlign: 'center',
                background:
                  detail.sign > 0
                    ? 'radial-gradient(120% 140% at 100% 0%, rgba(47,224,164,.12), transparent 60%), var(--surface-1)'
                    : 'var(--surface-1)',
              }}
            >
              <div
                className={`movement-icon ${detail.sign > 0 ? 'movement-icon--in' : 'movement-icon--out'}`}
                style={{ margin: '0 auto 0.6rem' }}
              >
                {detail.sign > 0 ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
              </div>
              <div className="tiny">{detail.title}</div>
              <div
                style={{
                  fontSize: '1.9rem',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  color: detail.sign > 0 ? 'var(--green)' : undefined,
                }}
                className="money"
              >
                {detail.sign > 0 ? '+' : '-'}
                {formatMoney(detail.amount)}
              </div>
              <div className="tiny">{formatDateTime(detail.createdAt)}</div>
            </div>

            <div className="card card--flat">
              <InfoRow label="Tipo" value={detail.title} />
              <InfoRow label="Fecha y hora" value={formatDateTime(detail.createdAt)} />
              <InfoRow label="Estado" value={detail.status === 'cancelled' ? 'Anulado' : 'Registrado'} />
              <InfoRow label="Referencia" value={detail.reference} />
              {detail.source === 'payment' && detail.method && (
                <InfoRow label="Método de pago" value={<PaymentMethodLabel method={detail.method} />} />
              )}
              {detail.policyName && <InfoRow label="Seguro" value={detail.policyName} />}
              {detail.installmentNumber !== undefined && (
                <InfoRow label="Cuota" value={`N.º ${detail.installmentNumber}`} />
              )}
              {detail.balanceAfter !== undefined && (
                <InfoRow label="Saldo después" value={formatMoney(detail.balanceAfter)} />
              )}
            </div>

            <div className="card card--flat">
              <div className="tiny">Descripción</div>
              <p className="small" style={{ marginTop: '0.3rem', lineHeight: 1.5 }}>
                {detail.description}
              </p>
              {detail.justification && (
                <>
                  <div className="divider" />
                  <div className="tiny">Justificación administrativa</div>
                  <p className="small" style={{ marginTop: '0.3rem' }}>
                    {detail.justification}
                  </p>
                </>
              )}
            </div>

            <p className="tiny">
              Los valores corresponden a operaciones simuladas de la DEMO y no representan movimientos de dinero real.
              Fecha mostrada: {formatDate(detail.date)}.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  )
}
