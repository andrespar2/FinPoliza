import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CircleAlert,
  HandHeart,
  Info,
  Landmark,
  LoaderCircle,
  PlusCircle,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { fundMovementsForUser, fundSummary } from '../../services/selectors'
import { depositToFund, withdrawFromFund } from '../../services/fund'
import { formatDate, formatMoney } from '../../lib/format'
import { DemoDisclaimer, EmptyState, ScreenHeader } from '../../components/ui/common'
import { Sheet } from '../../components/ui/Sheet'
import { MoneyInput } from '../../components/ui/forms'
import { useToast } from '../../components/ui/Feedback'
import { fundTypeLabel } from '../../services/fund'

type Mode = 'deposit' | 'withdraw'

export function FundScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const location = useLocation()
  const session = state.session!
  const movements = useMemo(() => fundMovementsForUser(state, session.id), [state, session.id])
  const summary = useMemo(() => fundSummary(movements), [movements])

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('deposit')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [newBalance, setNewBalance] = useState(0)

  const fundSettings = state.settings.fund
  const enabled = fundSettings.enabled && state.settings.features.fundEnabled

  const start = (nextMode: Mode) => {
    setMode(nextMode)
    setStep(1)
    setAmount(0)
    setError(null)
    setOpen(true)
  }

  useEffect(() => {
    const action = (location.state as { action?: Mode } | null)?.action
    if (action === 'deposit' || action === 'withdraw') {
      start(action)
      window.history.replaceState({}, document.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const validate = () => {
    setError(null)
    if (amount <= 0) {
      setError('Ingresa el valor que deseas ' + (mode === 'deposit' ? 'aportar.' : 'retirar.'))
      return false
    }
    if (mode === 'deposit' && amount < fundSettings.minDeposit) {
      setError(`La aportación mínima es de ${formatMoney(fundSettings.minDeposit)}.`)
      return false
    }
    if (mode === 'withdraw') {
      if (!fundSettings.allowWithdrawals) {
        setError('Los retiros están deshabilitados por la compañía en este momento.')
        return false
      }
      if (amount < fundSettings.minWithdrawal) {
        setError(`El retiro mínimo es de ${formatMoney(fundSettings.minWithdrawal)}.`)
        return false
      }
      if (amount > summary.balance) {
        setError(`El valor supera tu saldo disponible (${formatMoney(summary.balance)}).`)
        return false
      }
    }
    return true
  }

  const confirm = async () => {
    if (!validate()) return
    setProcessing(true)
    try {
      const result = mode === 'deposit' ? await depositToFund(amount) : await withdrawFromFund(amount)
      setNewBalance(result.balance)
      setStep(3)
      toast.success(mode === 'deposit' ? 'Aportación registrada.' : 'Retiro registrado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.')
    } finally {
      setProcessing(false)
    }
  }

  const resultingBalance = mode === 'deposit' ? summary.balance + amount : summary.balance - amount

  if (!enabled) {
    return (
      <div className="page">
        <ScreenHeader title="Fondo solidario" />
        <EmptyState
          icon={<HandHeart size={26} />}
          title="Fondo no disponible"
          text="La compañía deshabilitó temporalmente el fondo solidario. Intenta más tarde."
          action={
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/inicio')}>
              Volver al inicio
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <ScreenHeader
        title={fundSettings.title}
        subtitle="Tu ahorro voluntario, siempre disponible."
        actions={
          <button type="button" className="icon-btn" aria-label="Información del fondo" onClick={() => {
            document.getElementById('fund-info')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            <Info size={20} />
          </button>
        }
      />

      <section className="fund-hero">
        <span className="hero__eyebrow">Saldo disponible</span>
        <div className="fund-hero__balance">{formatMoney(summary.balance)}</div>
        <p className="hero__meta">Puedes retirarlo cuando lo necesites, sin restricciones en esta DEMO.</p>

        <div className="fund-split">
          <div className="fund-split__item">
            <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowDownLeft size={13} /> Total aportado
            </div>
            <div className="money strong" style={{ marginTop: '0.2rem', color: '#a6f5dc' }}>
              {formatMoney(summary.deposits + summary.adjustmentsCredit)}
            </div>
          </div>
          <div className="fund-split__item">
            <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowUpRight size={13} /> Total retirado
            </div>
            <div className="money strong" style={{ marginTop: '0.2rem' }}>
              {formatMoney(summary.withdrawals + summary.adjustmentsDebit)}
            </div>
          </div>
        </div>

        <div className="fund-actions">
          <button type="button" className="btn btn--success" onClick={() => start('deposit')}>
            <PlusCircle size={19} /> Agregar dinero
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => start('withdraw')}
            disabled={summary.balance <= 0 || !fundSettings.allowWithdrawals}
          >
            <Wallet size={19} /> Retirar dinero
          </button>
        </div>
      </section>

      {summary.lastMovement && (
        <div className="card card--flat" style={{ marginTop: '0.85rem' }}>
          <div className="row row--between">
            <span className="tiny">Último movimiento</span>
            <span className="tiny">{formatDate(summary.lastMovement.date)}</span>
          </div>
          <div className="row row--between" style={{ marginTop: '0.3rem' }}>
            <span className="strong small">
              {fundTypeLabel(summary.lastMovement.type)} · {formatMoney(summary.lastMovement.amount)}
            </span>
            <span className="tiny">Saldo: {formatMoney(summary.lastMovement.balanceAfter)}</span>
          </div>
        </div>
      )}

      <section className="section" id="fund-info">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          ¿Cómo funciona?
        </h2>
        <div className="card">
          <p className="small muted" style={{ lineHeight: 1.55 }}>
            {fundSettings.description}
          </p>
          <div className="divider" />
          <ul className="stack stack--sm">
            {fundSettings.rules.map((rule) => (
              <li key={rule} className="check-list__item">
                <Check size={16} />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <div className="divider" />
          <div className="row" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
            <Landmark size={17} className="dim" style={{ marginTop: '0.1rem' }} />
            <p className="tiny">
              Las aportaciones se registran en un fondo independiente de los ingresos de la compañía. Cada operación
              conserva su fecha, valor y saldo resultante.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Historial del fondo</h2>
          <span className="tiny">{movements.length} movimientos</span>
        </div>
        {movements.length === 0 ? (
          <EmptyState
            icon={<HandHeart size={26} />}
            title="Aún no has aportado"
            text="Agrega dinero a tu fondo solidario y empieza a construir tu ahorro."
            action={
              <button type="button" className="btn btn--success" onClick={() => start('deposit')}>
                Agregar dinero
              </button>
            }
          />
        ) : (
          <div className="list">
            {movements.map((movement) => {
              const isIn = movement.type === 'deposit' || movement.type === 'adjustment_credit'
              return (
                <div key={movement.id} className="list-row">
                  <span className={`movement-icon ${isIn ? 'movement-icon--in' : 'movement-icon--out'}`}>
                    {isIn ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                  </span>
                  <span className="list-row__body">
                    <span className="list-row__title">{fundTypeLabel(movement.type)}</span>
                    <span className="list-row__sub">
                      {formatDate(movement.date)} · {movement.time}
                      {movement.justification ? ' · Ajuste administrativo' : ''}
                    </span>
                    <span className="list-row__sub">Saldo después: {formatMoney(movement.balanceAfter)}</span>
                  </span>
                  <span className="list-row__value" style={{ color: isIn ? 'var(--green)' : '#ffb3b3' }}>
                    {isIn ? '+' : '-'}
                    {formatMoney(movement.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="section">
        <div className="card card--flat">
          <div className="row" style={{ gap: '0.55rem', alignItems: 'flex-start' }}>
            <ShieldCheck size={18} className="dim" style={{ marginTop: '0.1rem' }} />
            <p className="tiny">{fundSettings.conditions}</p>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <DemoDisclaimer />
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={
          step === 3
            ? undefined
            : mode === 'deposit'
              ? 'Agregar dinero al fondo'
              : 'Retirar dinero del fondo'
        }
        subtitle={
          step === 1
            ? mode === 'deposit'
              ? 'Elige un valor o escríbelo. Puedes aportar cuando quieras.'
              : `Tienes disponible ${formatMoney(summary.balance)}.`
            : step === 2
              ? 'Confirma los datos de la operación.'
              : undefined
        }
        footer={
          step === 1 ? (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                if (validate()) setStep(2)
              }}
            >
              Continuar
            </button>
          ) : step === 2 ? (
            <>
              {error && (
                <div className="form-error" role="alert">
                  <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
                </div>
              )}
              <button
                type="button"
                className={`btn ${mode === 'deposit' ? 'btn--success' : 'btn--primary'} btn--block btn--lg`}
                onClick={() => void confirm()}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <LoaderCircle size={20} style={{ animation: 'spin 0.9s linear infinite' }} /> Procesando…
                  </>
                ) : (
                  <>Confirmar {mode === 'deposit' ? 'aportación' : 'retiro'}</>
                )}
              </button>
              <button type="button" className="btn btn--ghost btn--block" onClick={() => setStep(1)} disabled={processing}>
                Volver
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary btn--block" onClick={() => setOpen(false)}>
              Entendido
            </button>
          )
        }
      >
        {step === 1 && (
          <div className="stack">
            {error && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
              </div>
            )}
            <div>
              <p className="field__label" style={{ marginBottom: '0.4rem' }}>
                Valor a {mode === 'deposit' ? 'aportar' : 'retirar'}
              </p>
              <MoneyInput value={amount} onChange={setAmount} autoFocus />
              <p className="field__hint" style={{ marginTop: '0.3rem' }}>
                {mode === 'deposit'
                  ? `Mínimo ${formatMoney(fundSettings.minDeposit)}`
                  : `Disponible ${formatMoney(summary.balance)} · mínimo ${formatMoney(fundSettings.minWithdrawal)}`}
              </p>
            </div>

            <div>
              <p className="field__label" style={{ marginBottom: '0.4rem' }}>
                Cantidades sugeridas
              </p>
              <div className="chip-row">
                {fundSettings.suggestedAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip chip--button ${amount === value ? 'chip--active' : ''}`}
                    onClick={() => {
                      setAmount(value)
                      setError(null)
                    }}
                  >
                    {formatMoney(value, { compact: true })}
                  </button>
                ))}
                {mode === 'withdraw' && summary.balance > 0 && (
                  <button
                    type="button"
                    className={`chip chip--button ${amount === summary.balance ? 'chip--active' : ''}`}
                    onClick={() => setAmount(summary.balance)}
                  >
                    Todo ({formatMoney(summary.balance, { compact: true })})
                  </button>
                )}
              </div>
            </div>

            <div className="card card--flat" style={{ marginTop: '0.3rem' }}>
              <div className="summary-row">
                <span className="summary-row__label">Saldo actual</span>
                <span className="summary-row__value">{formatMoney(summary.balance)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">{mode === 'deposit' ? 'Nueva aportación' : 'Valor del retiro'}</span>
                <span className="summary-row__value">{formatMoney(amount)}</span>
              </div>
              <div className="summary-row summary-row--total">
                <span className="summary-row__label">Nuevo saldo</span>
                <span className="summary-row__value text-green">{formatMoney(Math.max(0, resultingBalance))}</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <div className="card card--flat">
              <div className="summary-row">
                <span className="summary-row__label">Operación</span>
                <span className="summary-row__value">{mode === 'deposit' ? 'Aportación' : 'Retiro'}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Valor</span>
                <span className="summary-row__value">{formatMoney(amount)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Saldo actual</span>
                <span className="summary-row__value">{formatMoney(summary.balance)}</span>
              </div>
              <div className="summary-row summary-row--total">
                <span className="summary-row__label">Saldo después</span>
                <span className="summary-row__value text-green">{formatMoney(Math.max(0, resultingBalance))}</span>
              </div>
            </div>
            <div className="banner banner--gold">
              <Info size={17} style={{ flexShrink: 0 }} />
              <span>
                Operación simulada. No se mueve dinero real. El movimiento quedará registrado en tu historial contable.
              </span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center', paddingTop: '0.6rem' }}>
            <div className="success-mark">
              <Check size={38} />
            </div>
            <h2 className="sheet__title">{mode === 'deposit' ? '¡Aportación registrada!' : '¡Retiro registrado!'}</h2>
            <p className="small muted">
              {mode === 'deposit'
                ? `Agregaste ${formatMoney(amount)} a tu fondo solidario.`
                : `Retiraste ${formatMoney(amount)} de tu fondo solidario.`}
            </p>
            <div className="card card--green" style={{ width: '100%' }}>
              <div className="tiny">Nuevo saldo disponible</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
                {formatMoney(newBalance)}
              </div>
            </div>
            <p className="tiny">El movimiento ya está disponible en tu historial.</p>
          </div>
        )}
      </Sheet>
    </div>
  )
}
