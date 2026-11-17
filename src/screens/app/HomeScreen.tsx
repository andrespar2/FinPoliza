import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  CalendarClock,
  HandHeart,
  Landmark,
  PlusCircle,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { userDashboard } from '../../services/selectors'
import { formatDate, formatMoney, initials } from '../../lib/format'
import { greetingFor } from '../../lib/dates'
import { DemoDisclaimer, EmptyState, Money, SectionHeader } from '../../components/ui/common'
import { MovementRow } from '../../components/app/MovementRow'
import { nextDueLabel } from '../../services/selectors'
import { daysFromToday } from '../../lib/dates'

export function HomeScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const session = state.session
  if (!session) return null
  const data = userDashboard(state, session.id)
  const next = data.nextPayment
  const nextIsLate = next ? daysFromToday(next.installment.dueDate) < 0 : false

  return (
    <div className="page">
      <div className="greeting">
        <div style={{ minWidth: 0 }}>
          <div className="greeting__hello">{greetingFor()},</div>
          <h1 className="greeting__name">
            {session.firstName} {session.lastName.split(' ')[0]}
          </h1>
        </div>
        <div className="row" style={{ gap: '0.45rem' }}>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Notificaciones${data.unreadNotifications ? `, ${data.unreadNotifications} sin leer` : ''}`}
            onClick={() => navigate('/notificaciones')}
          >
            <Bell size={21} />
            {data.unreadNotifications > 0 && <span className="icon-dot" />}
          </button>
          <button
            type="button"
            className="avatar avatar--md avatar--gold"
            aria-label="Ir a mi perfil"
            onClick={() => navigate('/perfil')}
          >
            {initials(session.firstName, session.lastName)}
          </button>
        </div>
      </div>

      {next ? (
        <section className="hero" style={{ marginTop: '1.1rem' }} aria-label="Próximo pago">
          <div className="hero__row">
            <span className="hero__eyebrow">{nextIsLate ? 'Tienes una cuota vencida' : 'Próximo pago'}</span>
            <span className="hero__pill">
              <CalendarClock size={14} /> {nextDueLabel(next.installment.dueDate)}
            </span>
          </div>
          <div className="hero__amount">{formatMoney(next.installment.amount)}</div>
          <p className="hero__meta">
            Cuota {next.installment.number} de {next.policy.installmentsCount} · {next.policy.snapshot.name}
          </p>
          <p className="hero__meta" style={{ marginTop: '0.15rem' }}>
            Vence el {formatDate(next.installment.dueDate)}
          </p>
          <div className="row" style={{ gap: '0.55rem', marginTop: '1.1rem' }}>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ flex: 1 }}
              onClick={() => navigate(`/seguros/${next.policy.id}`, { state: { pay: true } })}
            >
              Pagar ahora <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ flex: '0 0 auto', paddingInline: '1rem' }}
              onClick={() => navigate('/seguros')}
            >
              <ShieldCheck size={18} />
            </button>
          </div>
        </section>
      ) : (
        <section className="hero hero--green" style={{ marginTop: '1.1rem' }} aria-label="Estado de tus seguros">
          <span className="hero__eyebrow">Todo al día</span>
          <div className="hero__amount" style={{ fontSize: '2rem' }}>
            No tienes pagos pendientes
          </div>
          <p className="hero__meta">
            {data.activePolicies > 0
              ? `Tus ${data.activePolicies} seguros están al día. Gracias por tu confianza.`
              : 'Explora el catálogo y encuentra la protección que necesitas.'}
          </p>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ marginTop: '1rem' }}
            onClick={() => navigate(data.activePolicies ? '/seguros' : '/catalogo')}
          >
            {data.activePolicies ? 'Ver mis seguros' : 'Ver seguros disponibles'} <ArrowRight size={18} />
          </button>
        </section>
      )}

      <div className="grid grid--3-md grid--kpi" style={{ marginTop: '0.85rem' }}>
        <div className="stat">
          <span className="stat__label">Seguros activos</span>
          <span className="stat__value">{data.activePolicies}</span>
          <span className="stat__meta">{data.overdueCount > 0 ? `${data.overdueCount} cuota(s) vencida(s)` : 'Al día'}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Total por pagar</span>
          <span className="stat__value money">{formatMoney(data.totalPending)}</span>
          <span className="stat__meta">En tus pólizas activas</span>
        </div>
        <div className="stat">
          <span className="stat__label">Fondo solidario</span>
          <span className="stat__value money text-green">{formatMoney(data.fund.balance)}</span>
          <span className="stat__meta">Saldo disponible</span>
        </div>
      </div>

      <div className="quick-actions" style={{ marginTop: '1.35rem' }}>
        <button type="button" className="quick-action" onClick={() => navigate('/catalogo')}>
          <PlusCircle /> Comprar seguro
        </button>
        <button type="button" className="quick-action" onClick={() => navigate('/seguros')}>
          <ShieldCheck /> Mis seguros
        </button>
        <button type="button" className="quick-action" onClick={() => navigate('/fondo', { state: { action: 'deposit' } })}>
          <HandHeart /> Aportar al fondo
        </button>
        <button type="button" className="quick-action" onClick={() => navigate('/movimientos')}>
          <ReceiptText /> Movimientos
        </button>
      </div>

      <section className="section">
        <SectionHeader title="Fondo solidario" action onAction={() => navigate('/fondo')} />
        <div className="card card--green">
          <div className="row row--between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Landmark size={13} /> Saldo disponible
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', marginTop: '0.15rem' }}>
                <Money value={data.fund.balance} />
              </div>
              <div className="tiny" style={{ marginTop: '0.1rem' }}>
                Aportaste {formatMoney(data.fund.deposits)} en total
              </div>
            </div>
            <div className="card-head__icon card-head__icon--green" aria-hidden="true">
              <HandHeart size={21} />
            </div>
          </div>
          <div className="row" style={{ gap: '0.55rem', marginTop: '0.95rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--success btn--sm"
              style={{ flex: 1 }}
              onClick={() => navigate('/fondo', { state: { action: 'deposit' } })}
            >
              <PlusCircle size={17} /> Agregar dinero
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              style={{ flex: 1 }}
              onClick={() => navigate('/fondo', { state: { action: 'withdraw' } })}
            >
              <Wallet size={17} /> Retirar
            </button>
          </div>
          {data.fund.lastMovement && (
            <p className="tiny" style={{ marginTop: '0.75rem' }}>
              Último movimiento: {formatDate(data.fund.lastMovement.date)} ·{' '}
              {data.fund.lastMovement.type === 'withdrawal' ? 'Retiro' : 'Aportación'} de{' '}
              {formatMoney(data.fund.lastMovement.amount)}
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <SectionHeader title="Últimos movimientos" action onAction={() => navigate('/movimientos')} />
        {data.recentMovements.length ? (
          <div className="list">
            {data.recentMovements.map((movement) => (
              <MovementRow key={movement.id} movement={movement} onClick={() => navigate('/movimientos')} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ReceiptText size={26} />}
            title="Aún no tienes movimientos"
            text="Cuando pagues una cuota o hagas una aportación al fondo, la verás aquí."
            action={
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate('/catalogo')}>
                Explorar seguros
              </button>
            }
          />
        )}
      </section>

      {data.policies.length === 0 && (
        <section className="section">
          <SectionHeader title="Protege lo que más quieres" />
          <EmptyState
            icon={<ShieldCheck size={26} />}
            title="Todavía no tienes seguros"
            text="Descubre coberturas pensadas para tu familia, tu hogar y tu tranquilidad."
            action={
              <button type="button" className="btn btn--primary" onClick={() => navigate('/catalogo')}>
                Ver catálogo <ArrowRight size={18} />
              </button>
            }
          />
        </section>
      )}

      <div style={{ marginTop: '1.4rem' }}>
        <DemoDisclaimer />
      </div>
    </div>
  )
}
