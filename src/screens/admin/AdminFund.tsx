import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleAlert,
  HandHeart,
  Landmark,
  LoaderCircle,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { clientUsers, fundConsolidated, userFundSummary } from '../../services/selectors'
import { adminFundAdjustment, fundTypeLabel } from '../../services/fund'
import { formatDate, formatMoney, fullName } from '../../lib/format'
import { AdminHeader, AdminSearch, FilterChips, NoPermission } from '../../components/admin/AdminUI'
import { EmptyState } from '../../components/ui/common'
import { Sheet } from '../../components/ui/Sheet'
import { Field, MoneyInput, SelectInput } from '../../components/ui/forms'
import { useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'

type Filter = 'all' | 'deposit' | 'withdrawal' | 'adjustment'

export function AdminFund() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const session = state.session!
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [type, setType] = useState<'adjustment_credit' | 'adjustment_debit'>('adjustment_credit')
  const [amount, setAmount] = useState(0)
  const [justification, setJustification] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const consolidated = useMemo(() => fundConsolidated(state), [state])
  const users = useMemo(() => clientUsers(state).map((user) => ({ user, summary: userFundSummary(state, user.id) })), [state])

  const movements = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.fundMovements
      .filter((m) => {
        if (filter === 'adjustment') return m.type === 'adjustment_credit' || m.type === 'adjustment_debit'
        if (filter === 'deposit') return m.type === 'deposit'
        if (filter === 'withdrawal') return m.type === 'withdrawal'
        return true
      })
      .filter((m) => {
        if (!q) return true
        const user = state.users.find((u) => u.id === m.userId)
        return [user ? fullName(user) : '', m.description, m.justification ?? ''].join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 100)
  }, [state, query, filter])

  if (!hasPermission(session, 'fund.view')) {
    return (
      <>
        <AdminHeader title="Fondo solidario" />
        <NoPermission permission="fund.view" />
      </>
    )
  }

  const canManage = hasPermission(session, 'fund.manage')
  const withFund = users.filter((u) => u.summary.movementCount > 0)

  const submitAdjustment = async () => {
    setError(null)
    if (!userId) {
      setError('Selecciona el usuario al que se aplicará el ajuste.')
      return
    }
    setSaving(true)
    try {
      await adminFundAdjustment(userId, type, amount, justification)
      toast.success('Ajuste registrado con su justificación.')
      setAdjustOpen(false)
      setAmount(0)
      setJustification('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el ajuste.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminHeader
        title="Fondo solidario"
        subtitle="Recursos de los usuarios administrados por la compañía. No son ingresos propios."
        actions={
          <>
            {canManage && (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAdjustOpen(true)}>
                <SlidersHorizontal size={16} /> Ajuste
              </button>
            )}
            {hasPermission(session, 'settings.manage') && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => navigate('/admin/configuracion')}
              >
                <Settings size={16} /> Configurar
              </button>
            )}
          </>
        }
      />

      <div className="grid grid--kpi">
        <div className="kpi kpi--green">
          <span className="kpi__label">
            <Landmark size={14} /> Saldo consolidado
          </span>
          <span className="kpi__value">{formatMoney(consolidated.balance)}</span>
          <span className="kpi__foot">Obligación con los usuarios</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">
            <ArrowDownLeft size={14} /> Aportaciones
          </span>
          <span className="kpi__value">{formatMoney(consolidated.deposits + consolidated.adjustmentsCredit, { compact: true })}</span>
          <span className="kpi__foot">Histórico registrado</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">
            <ArrowUpRight size={14} /> Retiros
          </span>
          <span className="kpi__value">{formatMoney(consolidated.withdrawals + consolidated.adjustmentsDebit, { compact: true })}</span>
          <span className="kpi__foot">Histórico registrado</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">
            <HandHeart size={14} /> Usuarios con fondo
          </span>
          <span className="kpi__value">{withFund.length}</span>
          <span className="kpi__foot">{consolidated.movementCount} movimientos</span>
        </div>
      </div>

      <div className="banner" style={{ marginTop: '1rem' }}>
        <CircleAlert size={17} style={{ flexShrink: 0 }} />
        <span>
          Los ajustes administrativos requieren justificación, generan auditoría y nunca eliminan movimientos
          históricos. El saldo se calcula sumando todos los movimientos.
        </span>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Saldos por usuario</h2>
          <span className="tiny">{withFund.length} cuentas</span>
        </div>
        {withFund.length === 0 ? (
          <EmptyState icon={<HandHeart size={26} />} title="Sin aportaciones" text="Todavía ningún usuario tiene movimientos en el fondo." />
        ) : (
          <div className="list">
            {withFund
              .sort((a, b) => b.summary.balance - a.summary.balance)
              .map(({ user, summary }) => (
                <div key={user.id} className="list-row">
                  <span className="list-row__icon list-row__icon--green">
                    <HandHeart size={18} />
                  </span>
                  <span className="list-row__body">
                    <span className="list-row__title">{fullName(user)}</span>
                    <span className="list-row__sub">
                      Aportes {formatMoney(summary.deposits + summary.adjustmentsCredit)} · retiros{' '}
                      {formatMoney(summary.withdrawals + summary.adjustmentsDebit)}
                    </span>
                  </span>
                  <span className="list-row__value text-green">{formatMoney(summary.balance)}</span>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Movimientos del fondo</h2>
          <span className="tiny">{state.fundMovements.length} en total</span>
        </div>
        <div className="admin-toolbar">
          <AdminSearch value={query} onChange={setQuery} placeholder="Buscar por usuario o descripción" />
        </div>
        <div className="admin-tabs" style={{ marginBottom: '0.8rem' }}>
          <FilterChips<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { key: 'all', label: 'Todos' },
              { key: 'deposit', label: 'Aportaciones' },
              { key: 'withdrawal', label: 'Retiros' },
              { key: 'adjustment', label: 'Ajustes' },
            ]}
          />
        </div>

        {movements.length === 0 ? (
          <EmptyState title="Sin movimientos" text="No hay movimientos que coincidan con la búsqueda." />
        ) : (
          <div className="list">
            {movements.map((movement) => {
              const isIn = movement.type === 'deposit' || movement.type === 'adjustment_credit'
              const user = state.users.find((u) => u.id === movement.userId)
              return (
                <div key={movement.id} className="list-row">
                  <span className={`list-row__icon ${isIn ? 'list-row__icon--green' : 'list-row__icon--red'}`}>
                    {isIn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </span>
                  <span className="list-row__body">
                    <span className="list-row__title">
                      {user ? fullName(user) : 'Usuario'} · {fundTypeLabel(movement.type)}
                    </span>
                    <span className="list-row__sub">
                      {formatDate(movement.date)} · {movement.time} · saldo {formatMoney(movement.balanceAfter)}
                    </span>
                    {movement.justification && <span className="list-row__sub">{movement.justification}</span>}
                  </span>
                  <span className="list-row__value" style={{ color: isIn ? 'var(--green)' : '#ff9a9a' }}>
                    {isIn ? '+' : '-'}
                    {formatMoney(movement.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <p className="tiny" style={{ marginTop: '0.6rem' }}>
          Se muestran los movimientos más recientes (máximo 100). Las consultas de auditoría conservan el histórico
          completo de las operaciones administrativas.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Configuración vigente del fondo</h2>
          {hasPermission(session, 'settings.manage') && (
            <button type="button" className="section-link" onClick={() => navigate('/admin/configuracion')}>
              Editar
            </button>
          )}
        </div>
        <div className="card card--flat">
          <div className="summary-row">
            <span className="summary-row__label">Fondo habilitado</span>
            <span className="summary-row__value">{state.settings.fund.enabled ? 'Sí' : 'No'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Aportación mínima</span>
            <span className="summary-row__value">{formatMoney(state.settings.fund.minDeposit)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Retiro mínimo</span>
            <span className="summary-row__value">{formatMoney(state.settings.fund.minWithdrawal)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Cantidades sugeridas</span>
            <span className="summary-row__value">{state.settings.fund.suggestedAmounts.map((a) => formatMoney(a, { compact: true })).join(' · ')}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Retiros permitidos</span>
            <span className="summary-row__value">{state.settings.fund.allowWithdrawals ? 'Sí' : 'No'}</span>
          </div>
        </div>
      </section>

      <Sheet
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Ajuste administrativo del fondo"
        subtitle="Toda modificación requiere justificación y queda auditada."
        footer={
          <>
            {error && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void submitAdjustment()} disabled={saving}>
              {saving ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <SlidersHorizontal size={18} />}
              Registrar ajuste
            </button>
          </>
        }
      >
        <div className="stack">
          <Field label="Usuario">
            <select className="select" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Selecciona un usuario</option>
              {clientUsers(state).map((user) => (
                <option key={user.id} value={user.id}>
                  {fullName(user)} · {formatMoney(userFundSummary(state, user.id).balance)}
                </option>
              ))}
            </select>
          </Field>
          <SelectInput
            label="Tipo de ajuste"
            value={type}
            onChange={(v) => setType(v as 'adjustment_credit' | 'adjustment_debit')}
            options={[
              { value: 'adjustment_credit', label: 'A favor del usuario (crédito)' },
              { value: 'adjustment_debit', label: 'En contra del usuario (débito)' },
            ]}
          />
          <Field label="Valor del ajuste">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="Justificación" hint="Mínimo 10 caracteres. Obligatoria para auditoría.">
            <textarea
              className="textarea"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explica el motivo del ajuste"
            />
          </Field>
          <div className="banner banner--gold">
            <CircleAlert size={17} style={{ flexShrink: 0 }} />
            <span>El ajuste se registra como un movimiento nuevo. No se eliminan ni modifican movimientos anteriores.</span>
          </div>
        </div>
      </Sheet>
    </>
  )
}
