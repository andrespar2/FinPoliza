import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CreditCard,
  HandHeart,
  Info,
  Layers,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { adminStats, auditLogs } from '../../services/selectors'
import { periodRange } from '../../lib/dates'
import { formatDate, formatMoney } from '../../lib/format'
import { AdminHeader, AdminSection, FilterChips, NoPermission } from '../../components/admin/AdminUI'
import { ProgressBar } from '../../components/ui/common'
import { BarChart, DonutChart } from '../../components/charts/Charts'
import { hasPermission } from '../../services/store'

type Period = 'month' | 'quarter' | 'year' | 'all'

export function AdminDashboard() {
  const state = useAppState()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('month')
  const stats = useMemo(() => adminStats(state, periodRange(period)), [state, period])
  const audit = auditLogs(state).slice(0, 4)
  const session = state.session!

  if (!hasPermission(session, 'dashboard.view')) {
    return (
      <>
        <AdminHeader title="Panel administrativo" />
        <NoPermission permission="dashboard.view" />
      </>
    )
  }

  const statusColors: Record<string, string> = {
    active: '#2fe0a4',
    overdue: '#ff6b6b',
    completed: '#60a5fa',
    cancelled: '#8e99aa',
  }
  const statusLabels: Record<string, string> = {
    active: 'Activos',
    overdue: 'En mora',
    completed: 'Completados',
    cancelled: 'Cancelados',
  }

  return (
    <>
      <AdminHeader
        title="Resumen financiero"
        subtitle={`${state.settings.company.name} · ${formatDate(new Date().toISOString())}`}
        actions={
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate('/admin/pagos')}>
            <CreditCard size={16} /> Ir a pagos
          </button>
        }
      />

      <div className="admin-toolbar">
        <FilterChips<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { key: 'month', label: 'Este mes' },
            { key: 'quarter', label: 'Trimestre' },
            { key: 'year', label: 'Este año' },
            { key: 'all', label: 'Histórico' },
          ]}
        />
      </div>

      <div className="grid grid--kpi-3">
        <div className="kpi kpi--green">
          <span className="kpi__label">
            <Banknote size={14} /> Pagos recibidos
          </span>
          <span className="kpi__value">{formatMoney(stats.periodCollected)}</span>
          <span className="kpi__foot">En el período · histórico {formatMoney(stats.totalCollected, { compact: true })}</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">
            <CalendarClock size={14} /> Pendiente por cobrar
          </span>
          <span className="kpi__value">{formatMoney(stats.pendingAmount, { compact: true })}</span>
          <span className="kpi__foot">{stats.pendingInstallments.length} cuotas próximas</span>
        </div>
        <div className="kpi kpi--red">
          <span className="kpi__label">
            <TriangleAlert size={14} /> Cuotas vencidas
          </span>
          <span className="kpi__value">{formatMoney(stats.overdueAmount, { compact: true })}</span>
          <span className="kpi__foot">{stats.overdueCount} cuotas en mora</span>
        </div>
        <div className="kpi kpi--blue">
          <span className="kpi__label">
            <HandHeart size={14} /> Fondo solidario
          </span>
          <span className="kpi__value">{formatMoney(stats.fundBalance, { compact: true })}</span>
          <span className="kpi__foot">Saldo de los usuarios</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">
            <Users size={14} /> Usuarios activos
          </span>
          <span className="kpi__value">{stats.activeUsers}</span>
          <span className="kpi__foot">{stats.suspendedUsers} suspendidos de {stats.totalUsers}</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">
            <ShieldCheck size={14} /> Pólizas activas
          </span>
          <span className="kpi__value">{stats.activePolicies}</span>
          <span className="kpi__foot">{stats.availableProducts} seguros disponibles</span>
        </div>
      </div>

      <div className="banner" style={{ marginTop: '1rem' }}>
        <Info size={17} style={{ flexShrink: 0 }} />
        <span>
          Los pagos de seguros son ingresos de la compañía. Las aportaciones al fondo solidario son recursos de los
          usuarios y se reportan por separado.
        </span>
      </div>

      <div className="grid grid--auto" style={{ marginTop: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))' }}>
        <section className="card">
          <div className="row row--between" style={{ marginBottom: '0.6rem' }}>
            <h2 className="card-title">Recaudo y fondo</h2>
            <span className="tiny">Últimos 6 meses</span>
          </div>
          <BarChart
            data={stats.monthly.map((m) => ({ label: m.label, values: [m.payments, m.deposits] }))}
            series={[
              { label: 'Pagos de seguros', color: '#3b82f6' },
              { label: 'Aportes al fondo', color: '#2fe0a4' },
            ]}
          />
        </section>

        <section className="card">
          <div className="row row--between" style={{ marginBottom: '0.8rem' }}>
            <h2 className="card-title">Estado de las pólizas</h2>
            <span className="tiny">{state.policies.length} en total</span>
          </div>
          <DonutChart
            segments={stats.policiesByStatus.map((s) => ({
              label: statusLabels[s.status] ?? s.status,
              value: s.count,
              color: statusColors[s.status] ?? '#8e99aa',
            }))}
            centerValue={String(state.policies.length)}
            centerLabel="pólizas"
          />
        </section>
      </div>

      <div className="grid grid--auto" style={{ marginTop: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))' }}>
        <section className="card">
          <div className="row row--between" style={{ marginBottom: '0.75rem' }}>
            <h2 className="card-title">Seguros más adquiridos</h2>
            <button type="button" className="section-link" onClick={() => navigate('/admin/seguros')}>
              Ver seguros <ArrowRight size={14} />
            </button>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="small dim">Aún no hay pólizas contratadas.</p>
          ) : (
            <div className="stack stack--sm">
              {stats.topProducts.map((item) => (
                <div key={item.product.id}>
                  <div className="row row--between" style={{ marginBottom: '0.3rem' }}>
                    <span className="small strong" style={{ minWidth: 0 }}>
                      {item.product.name}
                    </span>
                    <span className="tiny nowrap">
                      {item.count} {item.count === 1 ? 'póliza' : 'pólizas'}
                    </span>
                  </div>
                  <ProgressBar
                    value={(item.count / Math.max(1, stats.topProducts[0].count)) * 100}
                    thin
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="row row--between" style={{ marginBottom: '0.75rem' }}>
            <h2 className="card-title">Fondo solidario consolidado</h2>
            <button type="button" className="section-link" onClick={() => navigate('/admin/fondo')}>
              Gestionar <ArrowRight size={14} />
            </button>
          </div>
          <div className="stack stack--sm">
            <div className="row row--between">
              <span className="small muted">Aportaciones históricas</span>
              <span className="strong money text-green">{formatMoney(stats.fundDeposits)}</span>
            </div>
            <div className="row row--between">
              <span className="small muted">Retiros históricos</span>
              <span className="strong money">{formatMoney(stats.fundWithdrawals)}</span>
            </div>
            <div className="row row--between">
              <span className="small muted">Entradas del período</span>
              <span className="strong money">{formatMoney(stats.periodFundIn)}</span>
            </div>
            <div className="row row--between">
              <span className="small muted">Salidas del período</span>
              <span className="strong money">{formatMoney(stats.periodFundOut)}</span>
            </div>
            <div className="divider" style={{ margin: '0.3rem 0' }} />
            <div className="row row--between">
              <span className="strong">Saldo consolidado</span>
              <span className="strong money text-green" style={{ fontSize: '1.15rem' }}>
                {formatMoney(stats.fundBalance)}
              </span>
            </div>
          </div>
        </section>
      </div>

      <AdminSection
        title="Pagos recientes"
        action={
          <button type="button" className="section-link" onClick={() => navigate('/admin/pagos')}>
            Ver todos <ArrowRight size={14} />
          </button>
        }
      >
        <div className="list">
          {stats.recentPayments.length === 0 ? (
            <div className="list-row">
              <span className="small dim">No hay pagos registrados.</span>
            </div>
          ) : (
            stats.recentPayments.map((payment) => (
              <button key={payment.id} type="button" className="list-row" onClick={() => navigate('/admin/pagos')}>
                <span className="list-row__icon list-row__icon--green">
                  <CreditCard size={18} />
                </span>
                <span className="list-row__body">
                  <span className="list-row__title">{payment.concept}</span>
                  <span className="list-row__sub">
                    {formatDate(payment.date)} · {payment.code} · {payment.reference}
                  </span>
                </span>
                <span className="list-row__value text-green">{formatMoney(payment.amount)}</span>
              </button>
            ))
          )}
        </div>
      </AdminSection>

      <AdminSection title="Cartera próxima" action={<span className="tiny">{stats.pendingInstallments.length} cuotas</span>}>
        <div className="list">
          {stats.pendingInstallments.length === 0 ? (
            <div className="list-row">
              <span className="small dim">No hay cuotas próximas a vencer.</span>
            </div>
          ) : (
            stats.pendingInstallments.slice(0, 6).map(({ installment, policy, user }) => (
              <button
                key={installment.id}
                type="button"
                className="list-row"
                onClick={() => navigate('/admin/pagos')}
              >
                <span className="list-row__icon list-row__icon--blue">
                  <Layers size={18} />
                </span>
                <span className="list-row__body">
                  <span className="list-row__title">
                    {user ? `${user.firstName} ${user.lastName}` : 'Usuario'} · Cuota {installment.number}
                  </span>
                  <span className="list-row__sub">
                    {policy.snapshot.name} · vence {formatDate(installment.dueDate)}
                  </span>
                </span>
                <span className="list-row__value">{formatMoney(installment.amount)}</span>
              </button>
            ))
          )}
        </div>
      </AdminSection>

      {hasPermission(session, 'audit.view') && audit.length > 0 && (
        <AdminSection
          title="Actividad administrativa reciente"
          action={
            <button type="button" className="section-link" onClick={() => navigate('/admin/auditoria')}>
              Ver auditoría <ArrowRight size={14} />
            </button>
          }
        >
          <div className="list">
            {audit.map((entry) => (
              <div key={entry.id} className="audit-row">
                <span className="audit-row__dot" />
                <div style={{ minWidth: 0 }}>
                  <div className="small strong">{entry.description}</div>
                  <div className="tiny">
                    {entry.actorName} · {formatDate(entry.createdAt)} · {entry.entity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminSection>
      )}

      <div className="banner banner--gold" style={{ marginTop: '1.2rem' }}>
        <TrendingUp size={17} style={{ flexShrink: 0 }} />
        <span>
          Dashboard de demostración: las cifras reflejan las operaciones simuladas registradas en el dispositivo.
        </span>
      </div>
    </>
  )
}
