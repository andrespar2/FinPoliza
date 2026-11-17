import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  CreditCard,
  Info,
  Landmark,
  LoaderCircle,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { computePolicy, effectiveInstallmentStatus } from '../../services/selectors'
import { payInstallment } from '../../services/policies'
import { formatDate, formatDateTime, formatMoney } from '../../lib/format'
import {
  CheckList,
  DueLabel,
  EmptyState,
  InstallmentStatusBadge,
  PolicyStatusBadge,
  ProductIcon,
  ProgressBar,
  ScreenHeader,
} from '../../components/ui/common'
import { Sheet } from '../../components/ui/Sheet'
import { useToast } from '../../components/ui/Feedback'
import type { Installment, Payment, PaymentMethod } from '../../types'

const METHODS: { id: PaymentMethod; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: 'tarjeta_simulada', label: 'Tarjeta de crédito simulada', hint: 'No se solicitan datos reales', icon: CreditCard },
  { id: 'pse_simulado', label: 'PSE simulado', hint: 'Débito desde tu banco (simulado)', icon: Landmark },
  { id: 'transferencia_simulada', label: 'Transferencia simulada', hint: 'Registro manual de demostración', icon: Wallet },
]

export function PolicyDetailScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const location = useLocation()
  const { policyId } = useParams()
  const session = state.session!

  const policy = state.policies.find((p) => p.id === policyId && p.userId === session.id)
  const computed = useMemo(
    () => (policy ? computePolicy(policy, state.installments, state.settings.insurance.reminderDays) : null),
    [policy, state.installments, state.settings.insurance.reminderDays],
  )

  const [paySheet, setPaySheet] = useState(false)
  const [selected, setSelected] = useState<Installment | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('tarjeta_simulada')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [showConditions, setShowConditions] = useState(false)

  useEffect(() => {
    const intent = (location.state as { pay?: boolean } | null)?.pay
    if (intent && computed?.nextDue) {
      setSelected(computed.nextDue)
      setPayment(null)
      setError(null)
      setPaySheet(true)
    }
    // Solo al entrar con la intención de pagar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  if (!policy || !computed) {
    return (
      <div className="page">
        <ScreenHeader back="/seguros" title="Póliza no encontrada" />
        <EmptyState
          icon={<ShieldCheck size={26} />}
          title="No encontramos este seguro"
          text="Puede que la póliza no exista o no pertenezca a tu cuenta."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/seguros')}>
              Volver a mis seguros
            </button>
          }
        />
      </div>
    )
  }

  const openPay = (installment: Installment) => {
    setSelected(installment)
    setPayment(null)
    setError(null)
    setPaySheet(true)
  }

  const doPay = async () => {
    if (!selected) return
    setError(null)
    setProcessing(true)
    try {
      const result = await payInstallment({ installmentId: selected.id, method })
      setPayment(result)
      toast.success('Pago registrado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago.')
    } finally {
      setProcessing(false)
    }
  }

  const canPayOnline = state.settings.features.paymentsEnabled
  const nextDue = computed.nextDue

  return (
    <div className="page">
      <ScreenHeader back="/seguros" title={policy.snapshot.name} eyebrow="Detalle de póliza" />

      <section className="card card--pad-lg">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <ProductIcon name={policy.snapshot.icon} color={policy.snapshot.color} size={2} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="policy-card__name" style={{ fontSize: '1.12rem' }}>
              {policy.snapshot.name}
            </div>
            <div className="policy-card__meta">
              {policy.code} · {policy.modalityLabel}
            </div>
            <div className="policy-card__meta">Comprado el {formatDate(policy.purchasedAt)}</div>
          </div>
          <PolicyStatusBadge status={computed.effectiveStatus} />
        </div>

        <div className="divider" />

        <div className="row row--between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="tiny">Total pagado</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.035em' }} className="text-green">
              {formatMoney(computed.paidAmount)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny">Saldo pendiente</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 750 }}>{formatMoney(computed.pendingAmount)}</div>
          </div>
        </div>

        <div style={{ marginTop: '0.9rem' }}>
          <div className="row row--between" style={{ marginBottom: '0.35rem' }}>
            <span className="tiny">
              {computed.paidCount} de {policy.installmentsCount} cuotas pagadas
            </span>
            <span className="tiny">{computed.progress}%</span>
          </div>
          <ProgressBar value={computed.progress} tone={computed.overdueCount ? 'red' : 'green'} />
        </div>

        <div className="grid grid--3-md" style={{ marginTop: '1rem', gap: '0.5rem' }}>
          <div className="stat">
            <span className="stat__label">Total del seguro</span>
            <span className="stat__value" style={{ fontSize: '1.02rem' }}>
              {formatMoney(policy.totalAmount)}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Cuotas pendientes</span>
            <span className="stat__value" style={{ fontSize: '1.02rem' }}>
              {computed.pendingCount}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Próximo pago</span>
            <span className="stat__value" style={{ fontSize: '1.02rem' }}>
              {nextDue ? formatDate(nextDue.dueDate) : '—'}
            </span>
          </div>
        </div>
      </section>

      {nextDue && (
        <section className={`next-payment ${computed.overdueCount > 0 ? 'next-payment--late' : ''}`} style={{ marginTop: '0.9rem' }}>
          <div className="row row--between">
            <span className="tiny" style={{ fontWeight: 700, color: computed.overdueCount ? '#ff9a9a' : '#f7c948' }}>
              {computed.overdueCount > 0 ? 'CUIDADO · CUOTA VENCIDA' : 'PRÓXIMA CUOTA'}
            </span>
            <DueLabel date={nextDue.dueDate} />
          </div>
          <div className="next-payment__amount">{formatMoney(nextDue.amount)}</div>
          <div className="row row--between" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="small muted">
              Cuota {nextDue.number} · vence el {formatDate(nextDue.dueDate)}
            </span>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => openPay(nextDue)}
              disabled={!canPayOnline}
            >
              Pagar cuota
            </button>
          </div>
          {!canPayOnline && <p className="tiny text-red" style={{ marginTop: '0.4rem' }}>Los pagos están deshabilitados temporalmente.</p>}
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Calendario de pagos</h2>
          <span className="tiny">{computed.installments.length} cuotas</span>
        </div>
        <div className="list">
          {computed.installments.map((installment) => {
            const status = effectiveInstallmentStatus(installment, state.settings.insurance.reminderDays)
            const numClass =
              status === 'paid'
                ? 'installment-row__num--paid'
                : status === 'overdue'
                  ? 'installment-row__num--overdue'
                  : status === 'due-soon'
                    ? 'installment-row__num--soon'
                    : ''
            return (
              <button
                key={installment.id}
                type="button"
                className={`installment-row ${status !== 'paid' && status !== 'cancelled' ? 'installment-row--payable' : ''}`}
                onClick={() => {
                  if (status === 'pending' || status === 'due-soon' || status === 'overdue') openPay(installment)
                }}
                disabled={status === 'paid' || status === 'cancelled'}
                style={{ cursor: status === 'paid' || status === 'cancelled' ? 'default' : 'pointer' }}
              >
                <span className={`installment-row__num ${numClass}`}>{installment.number}</span>
                <span className="installment-row__main">
                  <span className="installment-row__title">Cuota {installment.number}</span>
                  <span className="installment-row__sub">
                    {installment.status === 'paid'
                      ? `Pagada el ${formatDate(installment.paidAt ?? installment.dueDate)}`
                      : `Vence el ${formatDate(installment.dueDate)}`}
                  </span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className="installment-row__amount">{formatMoney(installment.amount)}</span>
                  <span style={{ display: 'block', marginTop: '0.25rem' }}>
                    <InstallmentStatusBadge status={status} />
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="tiny" style={{ marginTop: '0.6rem' }}>
          Toca una cuota pendiente para pagarla. Los pagos de la DEMO son simulados.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Coberturas
        </h2>
        <div className="list">
          {policy.snapshot.coverage.map((coverage) => (
            <div key={coverage.label} className="list-row">
              <span className="list-row__icon list-row__icon--green">
                <ShieldCheck size={18} />
              </span>
              <span className="list-row__body">
                <span className="list-row__title">{coverage.label}</span>
                {coverage.detail && <span className="list-row__sub">{coverage.detail}</span>}
              </span>
              <span className="list-row__value text-green">{formatMoney(coverage.amount, { compact: true })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Beneficios
        </h2>
        <div className="card">
          <CheckList items={policy.snapshot.benefits} />
        </div>
      </section>

      <section className="section">
        <button
          type="button"
          className="list-row"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          onClick={() => setShowConditions((v) => !v)}
        >
          <span className="list-row__icon">
            <ReceiptText size={18} />
          </span>
          <span className="list-row__body">
            <span className="list-row__title">Condiciones del seguro</span>
            <span className="list-row__sub">Consulta las reglas de esta póliza</span>
          </span>
          <ChevronDown size={20} style={{ transform: showConditions ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
        </button>
        {showConditions && (
          <div className="card" style={{ marginTop: '0.5rem' }}>
            <ol className="stack stack--sm" style={{ paddingLeft: '1.1rem', margin: 0 }}>
              {policy.snapshot.conditions.map((condition) => (
                <li key={condition} className="small muted" style={{ lineHeight: 1.5 }}>
                  {condition}
                </li>
              ))}
            </ol>
            <div className="divider" />
            <div className="row" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
              <CalendarDays size={16} className="dim" style={{ marginTop: '0.1rem' }} />
              <p className="tiny">
                Vigencia: {policy.installmentsCount} {policy.installmentsCount === 1 ? 'pago' : 'cuotas'} ·{' '}
                {policy.modalityLabel}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="banner" style={{ marginTop: '1.2rem' }}>
        <Info size={17} style={{ flexShrink: 0 }} />
        <span>
          Este seguro hace parte de la DEMO de FinPoliza. Las coberturas y los valores son ilustrativos y no constituyen
          una póliza real.
        </span>
      </div>

      <Sheet
        open={paySheet}
        onClose={() => setPaySheet(false)}
        title={payment ? undefined : 'Pagar cuota'}
        subtitle={payment ? undefined : selected ? `Cuota ${selected.number} · vence el ${formatDate(selected.dueDate)}` : undefined}
        footer={
          payment ? (
            <button type="button" className="btn btn--primary btn--block" onClick={() => setPaySheet(false)}>
              Listo
            </button>
          ) : (
            <>
              {error && (
                <div className="form-error" role="alert">
                  <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
                </div>
              )}
              <button
                type="button"
                className="btn btn--primary btn--block btn--lg"
                onClick={() => void doPay()}
                disabled={processing || !selected}
              >
                {processing ? (
                  <>
                    <LoaderCircle size={20} style={{ animation: 'spin 0.9s linear infinite' }} /> Procesando pago…
                  </>
                ) : (
                  <>Pagar {selected ? formatMoney(selected.amount) : ''}</>
                )}
              </button>
            </>
          )
        }
      >
        {payment ? (
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center', paddingTop: '0.6rem' }}>
            <div className="success-mark">
              <Check size={38} />
            </div>
            <h2 className="sheet__title">Pago registrado</h2>
            <p className="small muted">Tu cuota fue pagada correctamente en la DEMO.</p>
            <div className="card card--green" style={{ width: '100%', textAlign: 'left' }}>
              <div className="summary-row">
                <span className="summary-row__label">Valor pagado</span>
                <span className="summary-row__value text-green">{formatMoney(payment.amount)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Comprobante</span>
                <span className="summary-row__value">{payment.code}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Referencia</span>
                <span className="summary-row__value">{payment.reference}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Fecha</span>
                <span className="summary-row__value">{formatDateTime(payment.createdAt)}</span>
              </div>
            </div>
            <p className="tiny">Puedes consultar este pago en Movimientos.</p>
          </div>
        ) : (
          <div className="stack">
            <div className="card card--flat">
              <div className="summary-row">
                <span className="summary-row__label">Seguro</span>
                <span className="summary-row__value" style={{ maxWidth: '60%' }}>
                  {policy.snapshot.name}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Cuota</span>
                <span className="summary-row__value">
                  {selected?.number} de {policy.installmentsCount}
                </span>
              </div>
              <div className="summary-row summary-row--total">
                <span className="summary-row__label">Valor a pagar</span>
                <span className="summary-row__value">{selected ? formatMoney(selected.amount) : '—'}</span>
              </div>
            </div>

            <p className="field__label">Método de pago</p>
            <div className="stack stack--sm">
              {METHODS.map((m) => {
                const Icon = m.icon
                const active = method === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`option-card ${active ? 'option-card--active' : ''}`}
                    onClick={() => setMethod(m.id)}
                  >
                    <span className={`radio ${active ? 'radio--active' : ''}`} aria-hidden="true" />
                    <Icon size={20} className="dim" />
                    <span className="list-row__body">
                      <span className="list-row__title">{m.label}</span>
                      <span className="list-row__sub">{m.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="banner banner--gold">
              <Info size={17} style={{ flexShrink: 0 }} />
              <span>
                Pago simulado de demostración. No se solicitarán datos bancarios reales ni se realizará ningún cobro.
              </span>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
