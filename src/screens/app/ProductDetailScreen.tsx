import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, CircleAlert, Info, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { purchasePolicy } from '../../services/policies'
import { addPeriod, todayISO } from '../../lib/dates'
import { formatDate, formatMoney } from '../../lib/format'
import { CheckList, EmptyState, ProductIcon, ScreenHeader } from '../../components/ui/common'
import { Sheet } from '../../components/ui/Sheet'
import { useToast } from '../../components/ui/Feedback'
import type { Policy } from '../../types'

export function ProductDetailScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const { productId } = useParams()
  const product = state.products.find((p) => p.id === productId)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [modalityId, setModalityId] = useState(product?.modalities[0]?.id ?? '')
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Policy | null>(null)

  if (!product) {
    return (
      <div className="page">
        <ScreenHeader back="/catalogo" title="Seguro no disponible" />
        <EmptyState
          icon={<Info size={26} />}
          title="No encontramos este seguro"
          text="Puede que ya no esté disponible en el catálogo."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/catalogo')}>
              Volver al catálogo
            </button>
          }
        />
      </div>
    )
  }

  const modality = product.modalities.find((m) => m.id === modalityId) ?? product.modalities[0]
  const total = Math.round(product.basePrice * (1 + modality.surchargePct / 100))
  const installmentAmount = Math.max(1, Math.round(total / modality.installments))
  const totalFinal = installmentAmount * modality.installments
  const firstDue =
    modality.periodicity === 'single' ? todayISO() : addPeriod(todayISO(), modality.periodicity, 1)

  const startPurchase = () => {
    setStep(1)
    setAccepted(false)
    setError(null)
    setCreated(null)
    setOpen(true)
  }

  const confirmPurchase = async () => {
    setError(null)
    if (!accepted) {
      setError('Debes confirmar que entiendes que esta es una compra simulada.')
      return
    }
    setSubmitting(true)
    try {
      const result = await purchasePolicy(product.id, modality.id)
      setCreated(result.policy)
      setStep(3)
      toast.success('¡Tu seguro quedó activo!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la compra.')
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyOwned = state.policies.some(
    (p) => p.userId === state.session?.id && p.productId === product.id && p.status === 'active',
  )

  return (
    <div className="page">
      <ScreenHeader back="/catalogo" title="Detalle del seguro" subtitle={product.category} />

      <section className="card card--pad-lg">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <ProductIcon name={product.icon} color={product.color} size={2.1} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2 }}>
              {product.name}
            </h2>
            <div className="row" style={{ gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              {product.featured && (
                <span className="featured-ribbon">
                  <Sparkles size={12} /> Destacado
                </span>
              )}
              <span className="badge badge--neutral">
                <CalendarDays size={13} /> {product.durationMonths} meses
              </span>
            </div>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: '1rem', lineHeight: 1.55 }}>
          {product.description}
        </p>
        <div className="divider" />
        <div className="row row--between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="tiny">Precio total del seguro</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
              {formatMoney(product.basePrice)}
            </div>
            <div className="tiny">
              Desde {formatMoney(Math.round(product.basePrice / product.modalities[0].installments))} /{' '}
              {product.modalities[0].periodicity === 'monthly' ? 'mes' : 'pago'}
            </div>
          </div>
          <button type="button" className="btn btn--primary" onClick={startPurchase} disabled={alreadyOwned}>
            {alreadyOwned ? 'Ya lo tienes' : 'Adquirir'} <ArrowRight size={19} />
          </button>
        </div>
        {alreadyOwned && (
          <div className="banner banner--green" style={{ marginTop: '0.9rem' }}>
            <ShieldCheck size={17} style={{ flexShrink: 0 }} />
            <span>Ya tienes este seguro activo. Puedes consultarlo en Mis seguros.</span>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Coberturas principales
        </h2>
        <div className="list">
          {product.coverage.map((coverage) => (
            <div key={coverage.label} className="list-row">
              <span className="list-row__icon list-row__icon--blue">
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
          Beneficios incluidos
        </h2>
        <div className="card">
          <CheckList items={product.benefits} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Modalidades de pago
        </h2>
        <div className="stack stack--sm">
          {product.modalities.map((m) => {
            const mTotal = Math.round(product.basePrice * (1 + m.surchargePct / 100))
            const mInstallment = Math.round(mTotal / m.installments)
            return (
              <div key={m.id} className="option-card" style={{ cursor: 'default' }}>
                <div className="list-row__icon list-row__icon--green">
                  <Check size={18} />
                </div>
                <div className="list-row__body">
                  <div className="list-row__title">{m.label}</div>
                  <div className="list-row__sub">
                    {m.installments === 1
                      ? `Un solo pago de ${formatMoney(mTotal)}`
                      : `${m.installments} cuotas de ${formatMoney(mInstallment)}`}
                    {m.surchargePct !== 0 && (
                      <span> · {m.surchargePct > 0 ? `+${m.surchargePct}%` : `${m.surchargePct}% de descuento`}</span>
                    )}
                  </div>
                </div>
                <span className="list-row__value">{formatMoney(mTotal)}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Condiciones del seguro
        </h2>
        <div className="card">
          <ol className="stack stack--sm" style={{ paddingLeft: '1.1rem', margin: 0 }}>
            {product.conditions.map((condition) => (
              <li key={condition} className="small muted" style={{ lineHeight: 1.5 }}>
                {condition}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="banner banner--gold" style={{ marginTop: '1.2rem' }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <span>
          Esta es una demostración. La contratación, las cuotas y los pagos son simulados y no generan obligaciones
          reales.
        </span>
      </div>

      <div style={{ marginTop: '1.2rem' }}>
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={startPurchase} disabled={alreadyOwned}>
          {alreadyOwned ? 'Ya tienes este seguro' : 'Adquirir este seguro'} <ArrowRight size={20} />
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={step === 3 ? undefined : step === 1 ? 'Elige cómo pagar' : 'Confirma tu compra'}
        subtitle={
          step === 1
            ? 'Selecciona la modalidad que mejor se adapte a ti.'
            : step === 2
              ? 'Revisa la información antes de confirmar.'
              : undefined
        }
        footer={
          step === 1 ? (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                setStep(2)
                setError(null)
              }}
            >
              Continuar <ArrowRight size={19} />
            </button>
          ) : step === 2 ? (
            <>
              {error && (
                <div className="form-error" role="alert">
                  <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
                </div>
              )}
              <button type="button" className="btn btn--primary btn--block" onClick={() => void confirmPurchase()} disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> Procesando…
                  </>
                ) : (
                  <>Confirmar compra simulada</>
                )}
              </button>
              <button type="button" className="btn btn--ghost btn--block" onClick={() => setStep(1)} disabled={submitting}>
                Volver
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => {
                  setOpen(false)
                  if (created) navigate(`/seguros/${created.id}`)
                }}
              >
                Ver mi seguro <ArrowRight size={19} />
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--block"
                onClick={() => {
                  setOpen(false)
                  navigate('/seguros')
                }}
              >
                Ir a Mis seguros
              </button>
            </>
          )
        }
      >
        {step === 1 && (
          <div className="stack">
            {product.modalities.map((m) => {
              const mTotal = Math.round(product.basePrice * (1 + m.surchargePct / 100))
              const mInstallment = Math.max(1, Math.round(mTotal / m.installments))
              const active = m.id === modality.id
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`option-card ${active ? 'option-card--active' : ''}`}
                  onClick={() => setModalityId(m.id)}
                >
                  <span className={`radio ${active ? 'radio--active' : ''}`} aria-hidden="true" />
                  <span className="list-row__body">
                    <span className="list-row__title">{m.label}</span>
                    <span className="list-row__sub">
                      {m.installments === 1
                        ? `Pago único de ${formatMoney(mTotal)}`
                        : `${m.installments} cuotas de ${formatMoney(mInstallment)}`}
                    </span>
                  </span>
                  <span className="list-row__value">{formatMoney(mTotal)}</span>
                </button>
              )
            })}
            <div className="card card--flat" style={{ marginTop: '0.5rem' }}>
              <div className="summary-row">
                <span className="summary-row__label">Valor de la cuota</span>
                <span className="summary-row__value">{formatMoney(installmentAmount)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Número de cuotas</span>
                <span className="summary-row__value">{modality.installments}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Primer vencimiento</span>
                <span className="summary-row__value">{formatDate(firstDue)}</span>
              </div>
              <div className="summary-row summary-row--total">
                <span className="summary-row__label">Total a pagar</span>
                <span className="summary-row__value">{formatMoney(totalFinal)}</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <div className="card card--flat">
              <div className="row" style={{ gap: '0.8rem', alignItems: 'flex-start' }}>
                <ProductIcon name={product.icon} color={product.color} />
                <div style={{ minWidth: 0 }}>
                  <div className="strong">{product.name}</div>
                  <div className="tiny">{modality.label}</div>
                </div>
              </div>
              <div className="divider" />
              <div className="summary-row">
                <span className="summary-row__label">Valor de cada cuota</span>
                <span className="summary-row__value">{formatMoney(installmentAmount)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Número de cuotas</span>
                <span className="summary-row__value">{modality.installments}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Primer vencimiento</span>
                <span className="summary-row__value">{formatDate(firstDue)}</span>
              </div>
              <div className="summary-row summary-row--total">
                <span className="summary-row__label">Total</span>
                <span className="summary-row__value">{formatMoney(totalFinal)}</span>
              </div>
            </div>
            <div className="banner banner--gold">
              <Info size={17} style={{ flexShrink: 0 }} />
              <span>Compra simulada: no se realizará ningún cobro real a tu tarjeta ni a tu cuenta.</span>
            </div>
            <label className="checkbox">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>
                Confirmo que entiendo que esta es una demostración y que el seguro se registrará en mi cuenta de
                prueba.
              </span>
            </label>
          </div>
        )}

        {step === 3 && created && (
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center', paddingTop: '1rem' }}>
            <div className="success-mark">
              <Check size={38} />
            </div>
            <h2 className="sheet__title">¡Compra exitosa!</h2>
            <p className="small muted">
              Tu {product.name} quedó activo con el código <strong>{created.code}</strong>.
            </p>
            <div className="card card--green" style={{ width: '100%', textAlign: 'left' }}>
              <div className="summary-row">
                <span className="summary-row__label">Total del seguro</span>
                <span className="summary-row__value">{formatMoney(created.totalAmount)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Cuotas</span>
                <span className="summary-row__value">
                  {created.installmentsCount} × {formatMoney(created.installmentAmount)}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Primer pago</span>
                <span className="summary-row__value">{formatDate(firstDue)}</span>
              </div>
            </div>
            <p className="tiny">Puedes pagar tu primera cuota desde Mis seguros cuando lo desees.</p>
          </div>
        )}
      </Sheet>
    </div>
  )
}
