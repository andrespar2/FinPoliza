import { useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Layers,
  LoaderCircle,
  Pencil,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import {
  effectiveInstallmentStatus,
  userName,
  userById,
} from '../../services/selectors'
import { cancelPayment, payInstallment, updateInstallment } from '../../services/policies'
import { formatDate, formatDateTime, formatMoney, fullName } from '../../lib/format'
import { AdminHeader, AdminSearch, FilterChips, NoPermission } from '../../components/admin/AdminUI'
import { DueLabel, EmptyState, InstallmentStatusBadge } from '../../components/ui/common'
import { Sheet } from '../../components/ui/Sheet'
import { Field, MoneyInput, SelectInput } from '../../components/ui/forms'
import { useConfirm, useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'
import type { Installment, Payment, PaymentMethod } from '../../types'

type Tab = 'payments' | 'pending' | 'overdue'

export function AdminPayments() {
  const state = useAppState()
  const toast = useToast()
  const confirm = useConfirm()
  const session = state.session!
  const [tab, setTab] = useState<Tab>('payments')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'paid' | 'cancelled'>('all')

  const [payTarget, setPayTarget] = useState<Installment | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const [detail, setDetail] = useState<Payment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const [editTarget, setEditTarget] = useState<Installment | null>(null)
  const [editAmount, setEditAmount] = useState(0)
  const [editDate, setEditDate] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const pending = useMemo(
    () =>
      state.installments
        .filter((i) => i.status === 'pending')
        .map((installment) => ({
          installment,
          policy: state.policies.find((p) => p.id === installment.policyId),
          user: userById(state, installment.userId),
        }))
        .filter((row) => row.policy && row.policy.status !== 'cancelled')
        .sort((a, b) => (a.installment.dueDate < b.installment.dueDate ? -1 : 1)),
    [state],
  )

  const overdue = pending.filter(
    ({ installment }) => effectiveInstallmentStatus(installment, state.settings.insurance.reminderDays) === 'overdue',
  )

  const payments = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.payments
      .filter((p) => (status === 'all' ? true : p.status === status))
      .filter((p) => {
        if (!q) return true
        const user = userById(state, p.userId)
        const policy = state.policies.find((x) => x.id === p.policyId)
        return [p.code, p.reference, p.concept, user ? fullName(user) : '', policy?.snapshot.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [state, query, status])

  const filteredPending = pending.filter(({ installment, user }) => {
    if (tab === 'overdue' && effectiveInstallmentStatus(installment, state.settings.insurance.reminderDays) !== 'overdue') {
      return false
    }
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [installment.policyId, user ? fullName(user) : '', installment.number]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  if (!hasPermission(session, 'payments.view')) {
    return (
      <>
        <AdminHeader title="Pagos" />
        <NoPermission permission="payments.view" />
      </>
    )
  }

  const canManage = hasPermission(session, 'payments.manage')

  const openPay = (installment: Installment) => {
    setPayTarget(installment)
    setPayError(null)
    setMethod('efectivo')
  }

  const registerPayment = async () => {
    if (!payTarget) return
    setPayError(null)
    setPaying(true)
    try {
      await payInstallment({ installmentId: payTarget.id, method })
      toast.success('Pago registrado correctamente.')
      setPayTarget(null)
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'No se pudo registrar el pago.')
    } finally {
      setPaying(false)
    }
  }

  const doCancel = async () => {
    if (!detail) return
    setCancelError(null)
    if (!cancelReason.trim()) {
      setCancelError('Escribe el motivo de la anulación.')
      return
    }
    const ok = await confirm({
      title: 'Anular pago',
      message:
        'El pago quedará anulado y la cuota volverá a estar pendiente. La operación quedará registrada en auditoría.',
      confirmLabel: 'Anular pago',
      danger: true,
    })
    if (!ok) return
    setCancelling(true)
    try {
      await cancelPayment(detail.id, cancelReason)
      toast.success('Pago anulado y cuota restablecida.')
      setDetail(null)
      setCancelReason('')
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'No se pudo anular el pago.')
    } finally {
      setCancelling(false)
    }
  }

  const openEdit = (installment: Installment) => {
    setEditTarget(installment)
    setEditAmount(installment.amount)
    setEditDate(installment.dueDate)
    setEditError(null)
  }

  const saveEdit = async () => {
    if (!editTarget) return
    setEditError(null)
    setSavingEdit(true)
    try {
      await updateInstallment(editTarget.id, { amount: editAmount, dueDate: editDate })
      toast.success('Cuota actualizada.')
      setEditTarget(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'No se pudo actualizar la cuota.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <>
      <AdminHeader
        title="Pagos y cuotas"
        subtitle={`${state.payments.filter((p) => p.status === 'paid').length} pagos · ${pending.length} cuotas pendientes · ${overdue.length} vencidas`}
      />

      <div className="grid grid--3-md" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="kpi kpi--green">
          <span className="kpi__label">Recaudado histórico</span>
          <span className="kpi__value" style={{ fontSize: '1.2rem' }}>
            {formatMoney(state.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0))}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Por cobrar</span>
          <span className="kpi__value" style={{ fontSize: '1.2rem' }}>
            {formatMoney(pending.reduce((s, p) => s + p.installment.amount, 0))}
          </span>
        </div>
        <div className="kpi kpi--red">
          <span className="kpi__label">En mora</span>
          <span className="kpi__value" style={{ fontSize: '1.2rem' }}>
            {formatMoney(overdue.reduce((s, p) => s + p.installment.amount, 0))}
          </span>
        </div>
      </div>

      <div className="admin-toolbar">
        <AdminSearch value={query} onChange={setQuery} placeholder="Buscar por usuario, seguro, código o referencia" />
      </div>

      <div className="admin-tabs" style={{ marginBottom: '0.9rem' }}>
        <FilterChips<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'payments', label: 'Pagos registrados', count: state.payments.length },
            { key: 'pending', label: 'Cuotas por cobrar', count: pending.length },
            { key: 'overdue', label: 'Cuotas vencidas', count: overdue.length },
          ]}
        />
      </div>

      {tab === 'payments' ? (
        <>
          <div className="admin-tabs" style={{ marginBottom: '0.6rem' }}>
            <FilterChips<'all' | 'paid' | 'cancelled'>
              value={status}
              onChange={setStatus}
              options={[
                { key: 'all', label: 'Todos', count: state.payments.length },
                { key: 'paid', label: 'Pagados', count: state.payments.filter((p) => p.status === 'paid').length },
                { key: 'cancelled', label: 'Anulados', count: state.payments.filter((p) => p.status === 'cancelled').length },
              ]}
            />
          </div>
          {payments.length === 0 ? (
            <EmptyState icon={<ReceiptText size={26} />} title="No hay pagos" text="No encontramos pagos con estos filtros." />
          ) : (
            <div className="list">
              {payments.map((payment) => (
                <button key={payment.id} type="button" className="list-row" onClick={() => setDetail(payment)}>
                  <span className="list-row__icon list-row__icon--green">
                    <CreditCard size={18} />
                  </span>
                  <span className="list-row__body">
                    <span className="list-row__title">{payment.concept}</span>
                    <span className="list-row__sub">
                      {userName(state, payment.userId)} · {formatDate(payment.date)} · {payment.code}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="list-row__value text-green">{formatMoney(payment.amount)}</span>
                    <span className="tiny" style={{ display: 'block' }}>
                      {payment.status === 'paid' ? 'Pagado' : 'Anulado'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {filteredPending.length === 0 ? (
            <EmptyState
              icon={tab === 'overdue' ? <TriangleAlert size={26} /> : <CalendarClock size={26} />}
              title={tab === 'overdue' ? 'No hay cuotas vencidas' : 'No hay cuotas pendientes'}
              text="La cartera está al día con los filtros seleccionados."
            />
          ) : (
            <div className="list">
              {filteredPending.map(({ installment, policy, user }) => {
                const effective = effectiveInstallmentStatus(installment, state.settings.insurance.reminderDays)
                return (
                  <div key={installment.id} className="list-row" style={{ flexWrap: 'wrap' }}>
                    <span className="list-row__icon list-row__icon--blue">
                      <Layers size={18} />
                    </span>
                    <span className="list-row__body">
                      <span className="list-row__title">
                        {user ? fullName(user) : 'Usuario'} · cuota {installment.number}
                      </span>
                      <span className="list-row__sub">{policy?.snapshot.name} · {policy?.code}</span>
                      <span className="list-row__sub">
                        <DueLabel date={installment.dueDate} /> <InstallmentStatusBadge status={effective} />
                      </span>
                    </span>
                    <span className="list-row__value">{formatMoney(installment.amount)}</span>
                    {canManage && (
                      <span className="row" style={{ gap: '0.3rem', width: '100%', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => openEdit(installment)}>
                          <Pencil size={14} /> Editar
                        </button>
                        <button type="button" className="btn btn--primary btn--sm" onClick={() => openPay(installment)}>
                          <CheckCircle2 size={14} /> Registrar pago
                        </button>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <Sheet
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Registrar pago manual"
        subtitle={payTarget ? `Cuota ${payTarget.number} · ${formatMoney(payTarget.amount)}` : undefined}
        footer={
          <>
            {payError && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{payError}</span>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void registerPayment()} disabled={paying}>
              {paying ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <CheckCircle2 size={19} />}
              Confirmar pago
            </button>
          </>
        }
      >
        {payTarget && (
          <div className="stack">
            <div className="card card--flat">
              <div className="summary-row">
                <span className="summary-row__label">Usuario</span>
                <span className="summary-row__value">{userName(state, payTarget.userId)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Vencimiento</span>
                <span className="summary-row__value">{formatDate(payTarget.dueDate)}</span>
              </div>
              <div className="summary-row summary-row--total">
                <span className="summary-row__label">Valor</span>
                <span className="summary-row__value">{formatMoney(payTarget.amount)}</span>
              </div>
            </div>
            <SelectInput
              label="Método de pago"
              value={method}
              onChange={(v) => setMethod(v as PaymentMethod)}
              options={[
                { value: 'efectivo', label: 'Efectivo (ventanilla)' },
                { value: 'transferencia_simulada', label: 'Transferencia simulada' },
                { value: 'tarjeta_simulada', label: 'Tarjeta simulada' },
                { value: 'pse_simulado', label: 'PSE simulado' },
              ]}
            />
            <div className="banner banner--gold">
              <CircleAlert size={17} style={{ flexShrink: 0 }} />
              <span>El pago es simulado y quedará registrado en la auditoría administrativa.</span>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!detail}
        onClose={() => {
          setDetail(null)
          setCancelReason('')
          setCancelError(null)
        }}
        title="Detalle del pago"
        footer={
          canManage && detail?.status === 'paid' ? (
            <>
              {cancelError && (
                <div className="form-error" role="alert">
                  <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{cancelError}</span>
                </div>
              )}
              <button
                type="button"
                className="btn btn--soft-danger btn--block"
                onClick={() => void doCancel()}
                disabled={cancelling}
              >
                {cancelling ? <LoaderCircle size={18} style={{ animation: 'spin 0.9s linear infinite' }} /> : <XCircle size={18} />}
                Anular pago
              </button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="stack">
            <div className="card card--flat">
              <div className="summary-row">
                <span className="summary-row__label">Concepto</span>
                <span className="summary-row__value">{detail.concept}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Usuario</span>
                <span className="summary-row__value">{userName(state, detail.userId)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Valor</span>
                <span className="summary-row__value text-green">{formatMoney(detail.amount)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Fecha y hora</span>
                <span className="summary-row__value">{formatDateTime(detail.createdAt)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Método</span>
                <span className="summary-row__value">{detail.method.replace(/_/g, ' ')}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Código</span>
                <span className="summary-row__value">{detail.code}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Referencia</span>
                <span className="summary-row__value">{detail.reference}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Estado</span>
                <span className="summary-row__value">
                  <InstallmentStatusBadge status={detail.status === 'paid' ? 'paid' : 'cancelled'} />
                </span>
              </div>
            </div>
            {canManage && detail.status === 'paid' && (
              <Field label="Motivo de anulación" hint="Obligatorio. Quedará en auditoría.">
                <input
                  className="input"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Pago registrado por error"
                />
              </Field>
            )}
            {detail.notes && <p className="tiny">Notas: {detail.notes}</p>}
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar cuota"
        subtitle="Ajusta el valor o la fecha de vencimiento de una cuota pendiente."
        footer={
          <>
            {editError && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{editError}</span>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void saveEdit()} disabled={savingEdit}>
              {savingEdit ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <RefreshCw size={18} />}
              Guardar cambios
            </button>
          </>
        }
      >
        {editTarget && (
          <div className="stack">
            <Field label="Valor de la cuota">
              <MoneyInput value={editAmount} onChange={setEditAmount} />
            </Field>
            <Field label="Fecha de vencimiento">
              <input className="input" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </Field>
            <div className="banner">
              <CircleAlert size={17} style={{ flexShrink: 0 }} />
              <span>El nuevo valor ajusta el total de la póliza. La modificación queda registrada en auditoría.</span>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
