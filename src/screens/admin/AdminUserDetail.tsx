import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  HandHeart,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import {
  computedPoliciesForUser,
  fundMovementsForUser,
  fundSummary,
  paymentsForUser,
  roleOfUser,
} from '../../services/selectors'
import { changeUserRole, deleteUser, resetUserPassword, setUserStatus } from '../../services/usersAdmin'
import { cancelPolicy, payInstallment } from '../../services/policies'
import { formatDate, formatDateTime, formatMoney, fullName, initials } from '../../lib/format'
import { AdminHeader, AdminSection, NoPermission } from '../../components/admin/AdminUI'
import {
  DueLabel,
  EmptyState,
  InstallmentStatusBadge,
  PolicyStatusBadge,
  UserStatusBadge,
} from '../../components/ui/common'
import { Sheet } from '../../components/ui/Sheet'
import { Field, PasswordInput, SelectInput } from '../../components/ui/forms'
import { useConfirm, useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'
import type { Installment, Payment, PaymentMethod, Policy } from '../../types'

export function AdminUserDetail() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { id } = useParams()
  const session = state.session!
  const user = state.users.find((u) => u.id === id)

  const [resetOpen, setResetOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const [payOpen, setPayOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null)
  const [showAllPayments, setShowAllPayments] = useState(false)
  const [showAllFund, setShowAllFund] = useState(false)
  const [roleId, setRoleId] = useState(user?.roleId ?? 'role_user')
  const [cancelTarget, setCancelTarget] = useState<Policy | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const policies = useMemo(() => (user ? computedPoliciesForUser(state, user.id) : []), [state, user])
  const payments = useMemo(() => (user ? paymentsForUser(state, user.id) : []), [state, user])
  const fundMovements = useMemo(() => (user ? fundMovementsForUser(state, user.id) : []), [state, user])
  const fund = useMemo(() => fundSummary(fundMovements), [fundMovements])
  const pendingInstallments = policies.flatMap((p) =>
    p.installments
      .filter((i) => i.status === 'pending' && p.effectiveStatus !== 'cancelled')
      .map((i) => ({ installment: i, policy: p.policy })),
  )

  if (!hasPermission(session, 'users.view')) {
    return (
      <>
        <AdminHeader title="Usuario" back="/admin/usuarios" />
        <NoPermission permission="users.view" />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <AdminHeader title="Usuario no encontrado" back="/admin/usuarios" />
        <EmptyState
          icon={<UserRound size={26} />}
          title="No encontramos este usuario"
          text="Puede que la cuenta haya sido eliminada."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/admin/usuarios')}>
              Volver a usuarios
            </button>
          }
        />
      </>
    )
  }

  const canManage = hasPermission(session, 'users.manage')
  const canPay = hasPermission(session, 'payments.manage')
  const canCancelPolicy =
    hasPermission(session, 'insurances.manage') || hasPermission(session, 'payments.manage')
  const role = roleOfUser(state, user)
  const totalPending = policies.reduce((sum, p) => sum + p.pendingAmount, 0)
  const totalPaid = policies.reduce((sum, p) => sum + p.paidAmount, 0)

  const toggleStatus = async () => {
    const next = user.status === 'active' ? 'suspended' : 'active'
    const ok = await confirm({
      title: next === 'suspended' ? 'Suspender cuenta' : 'Reactivar cuenta',
      message:
        next === 'suspended'
          ? 'El usuario no podrá iniciar sesión mientras la cuenta esté suspendida. Su historial se conserva.'
          : 'El usuario podrá volver a iniciar sesión y consultar su información.',
      confirmLabel: next === 'suspended' ? 'Suspender' : 'Reactivar',
      danger: next === 'suspended',
    })
    if (!ok) return
    try {
      await setUserStatus(user.id, next)
      toast.success(next === 'suspended' ? 'Cuenta suspendida.' : 'Cuenta reactivada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado.')
    }
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Eliminar usuario',
      message:
        'Solo se pueden eliminar usuarios sin historial financiero. Si tiene pólizas o movimientos, suspende la cuenta.',
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteUser(user.id)
      toast.success('Usuario eliminado.')
      navigate('/admin/usuarios')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el usuario.')
    }
  }

  const resetPassword = async () => {
    setResetError(null)
    if (newPassword !== confirmPassword) {
      setResetError('Las contraseñas no coinciden.')
      return
    }
    setResetBusy(true)
    try {
      await resetUserPassword(user.id, newPassword)
      toast.success('Contraseña restablecida. El usuario deberá cambiarla al ingresar.')
      setResetOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setResetBusy(false)
    }
  }

  const registerPayment = async () => {
    if (!selectedInstallment) return
    setPayError(null)
    setPayBusy(true)
    try {
      await payInstallment({ installmentId: selectedInstallment.id, method })
      toast.success('Pago registrado correctamente.')
      setPayOpen(false)
      setSelectedInstallment(null)
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'No se pudo registrar el pago.')
    } finally {
      setPayBusy(false)
    }
  }

  const updateRole = async () => {
    try {
      await changeUserRole(user.id, roleId)
      toast.success('Rol actualizado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el rol.')
    }
  }

  const doCancelPolicy = async () => {
    if (!cancelTarget) return
    setCancelError(null)
    if (!cancelReason.trim()) {
      setCancelError('Escribe el motivo de la cancelación.')
      return
    }
    setCancelBusy(true)
    try {
      await cancelPolicy(cancelTarget.id, cancelReason)
      toast.success('Póliza cancelada. Las cuotas pendientes fueron anuladas.')
      setCancelTarget(null)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'No se pudo cancelar la póliza.')
    } finally {
      setCancelBusy(false)
    }
  }

  return (
    <>
      <AdminHeader
        title={fullName(user)}
        subtitle={`${user.docType} ${user.docNumber} · ${user.email}`}
        back="/admin/usuarios"
        actions={
          canManage ? (
            <>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(`/admin/usuarios/${user.id}/editar`)}>
                <Pencil size={16} /> Editar
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => void toggleStatus()}>
                {user.status === 'active' ? <Ban size={16} /> : <BadgeCheck size={16} />}
                {user.status === 'active' ? 'Suspender' : 'Activar'}
              </button>
            </>
          ) : undefined
        }
      />

      <section className="card card--pad-lg">
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="avatar avatar--lg">{initials(user.firstName, user.lastName)}</div>
          <div style={{ flex: 1, minWidth: '12rem' }}>
            <div className="row" style={{ gap: '0.45rem', flexWrap: 'wrap' }}>
              <UserStatusBadge status={user.status} />
              <span className="badge badge--gold">{role?.name}</span>
              {user.mustChangePassword && <span className="badge badge--amber">Debe cambiar contraseña</span>}
            </div>
            <div className="info-grid" style={{ marginTop: '0.9rem' }}>
              <div className="row" style={{ gap: '0.45rem' }}>
                <Mail size={15} className="dim" />
                <span className="small">{user.email}</span>
              </div>
              <div className="row" style={{ gap: '0.45rem' }}>
                <Phone size={15} className="dim" />
                <span className="small">{user.phone}</span>
              </div>
              <div className="row" style={{ gap: '0.45rem' }}>
                <MapPin size={15} className="dim" />
                <span className="small">
                  {user.address || 'Sin dirección'} {user.city ? `· ${user.city}` : ''}
                </span>
              </div>
              <div className="row" style={{ gap: '0.45rem' }}>
                <UserRound size={15} className="dim" />
                <span className="small">Registrado el {formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="grid grid--3-md" style={{ gap: '0.5rem' }}>
          <div className="stat">
            <span className="stat__label">Total pagado</span>
            <span className="stat__value money text-green" style={{ fontSize: '1.05rem' }}>
              {formatMoney(totalPaid)}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Saldo pendiente</span>
            <span className="stat__value money" style={{ fontSize: '1.05rem' }}>
              {formatMoney(totalPending)}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Fondo solidario</span>
            <span className="stat__value money text-green" style={{ fontSize: '1.05rem' }}>
              {formatMoney(fund.balance)}
            </span>
          </div>
        </div>

        {canManage && (
          <>
            <div className="divider" />
            <div className="grid grid--2" style={{ alignItems: 'end' }}>
              <Field label="Rol asignado">
                <select className="select" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  {state.roles
                    .filter((r) => r.level !== 'owner' || session.roleLevel === 'owner')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </Field>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => void updateRole()}
                disabled={roleId === user.roleId}
              >
                Actualizar rol
              </button>
            </div>
          </>
        )}

        {canManage && (
          <div className="btn-row" style={{ marginTop: '0.85rem' }}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setResetOpen(true)}>
              <KeyRound size={16} /> Restablecer contraseña
            </button>
            <button type="button" className="btn btn--soft-danger btn--sm" onClick={() => void remove()}>
              <Trash2 size={16} /> Eliminar usuario
            </button>
          </div>
        )}

        {user.notes && (
          <>
            <div className="divider" />
            <div className="tiny">Notas internas</div>
            <p className="small muted" style={{ marginTop: '0.2rem' }}>
              {user.notes}
            </p>
          </>
        )}
      </section>

      <AdminSection title="Seguros contratados" action={<span className="tiny">{policies.length} pólizas</span>}>
        {policies.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={24} />} title="Sin seguros" text="Este usuario aún no tiene pólizas contratadas." />
        ) : (
          <div className="stack stack--sm">
            {policies.map((computed) => (
              <div key={computed.policy.id} className="card card--flat">
                <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="strong">{computed.policy.snapshot.name}</div>
                    <div className="tiny">
                      {computed.policy.code} · {computed.policy.modalityLabel}
                    </div>
                  </div>
                  <PolicyStatusBadge status={computed.effectiveStatus} />
                </div>
                <div className="row row--between" style={{ marginTop: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span className="tiny">
                    {computed.paidCount}/{computed.policy.installmentsCount} cuotas · Pagado{' '}
                    {formatMoney(computed.paidAmount)}
                  </span>
                  <span className="tiny">Pendiente {formatMoney(computed.pendingAmount)}</span>
                </div>
                {computed.nextDue && (
                  <div className="row row--between" style={{ marginTop: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <DueLabel date={computed.nextDue.dueDate} />
                    <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                      {canPay && (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => {
                            setSelectedInstallment(computed.nextDue ?? null)
                            setPayOpen(true)
                            setPayError(null)
                          }}
                        >
                          Registrar pago
                        </button>
                      )}
                      {canCancelPolicy &&
                        computed.effectiveStatus !== 'cancelled' &&
                        computed.effectiveStatus !== 'completed' && (
                          <button
                            type="button"
                            className="btn btn--soft-danger btn--sm"
                            onClick={() => {
                              setCancelTarget(computed.policy)
                              setCancelReason('')
                              setCancelError(null)
                            }}
                          >
                            Cancelar póliza
                          </button>
                        )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Historial de pagos"
        action={
          payments.length > 5 ? (
            <button type="button" className="section-link" onClick={() => setShowAllPayments((v) => !v)}>
              {showAllPayments ? 'Ver menos' : `Ver todos (${payments.length})`}
            </button>
          ) : (
            <span className="tiny">{payments.length} pagos</span>
          )
        }
      >
        {payments.length === 0 ? (
          <EmptyState icon={<ReceiptText size={24} />} title="Sin pagos" text="Este usuario no tiene pagos registrados." />
        ) : (
          <div className="list">
            {(showAllPayments ? payments : payments.slice(0, 5)).map((payment) => (
              <button key={payment.id} type="button" className="list-row" onClick={() => setPaymentDetail(payment)}>
                <span className="list-row__icon list-row__icon--green">
                  <CreditCard size={18} />
                </span>
                <span className="list-row__body">
                  <span className="list-row__title">{payment.concept}</span>
                  <span className="list-row__sub">
                    {formatDate(payment.date)} · {payment.code} · {payment.status === 'paid' ? 'Pagado' : 'Anulado'}
                  </span>
                </span>
                <span className="list-row__value">{formatMoney(payment.amount)}</span>
              </button>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Fondo solidario"
        action={
          fundMovements.length > 5 ? (
            <button type="button" className="section-link" onClick={() => setShowAllFund((v) => !v)}>
              {showAllFund ? 'Ver menos' : `Ver todos (${fundMovements.length})`}
            </button>
          ) : (
            <span className="tiny">{fundMovements.length} movimientos</span>
          )
        }
      >
        <div className="card card--flat" style={{ marginBottom: '0.6rem' }}>
          <div className="row row--between">
            <div>
              <div className="tiny">Saldo disponible</div>
              <div className="strong money text-green" style={{ fontSize: '1.3rem' }}>
                {formatMoney(fund.balance)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="tiny">Aportes / retiros</div>
              <div className="small">
                {formatMoney(fund.deposits + fund.adjustmentsCredit)} / {formatMoney(fund.withdrawals + fund.adjustmentsDebit)}
              </div>
            </div>
          </div>
        </div>
        {fundMovements.length === 0 ? (
          <EmptyState icon={<HandHeart size={24} />} title="Sin movimientos" text="El usuario aún no tiene operaciones en el fondo." />
        ) : (
          <div className="list">
            {(showAllFund ? fundMovements : fundMovements.slice(0, 5)).map((movement) => {
              const isIn = movement.type === 'deposit' || movement.type === 'adjustment_credit'
              return (
                <div key={movement.id} className="list-row">
                  <span className={`list-row__icon ${isIn ? 'list-row__icon--green' : 'list-row__icon--red'}`}>
                    <HandHeart size={18} />
                  </span>
                  <span className="list-row__body">
                    <span className="list-row__title">
                      {movement.type === 'deposit'
                        ? 'Aportación'
                        : movement.type === 'withdrawal'
                          ? 'Retiro'
                          : isIn
                            ? 'Ajuste a favor'
                            : 'Ajuste en contra'}
                    </span>
                    <span className="list-row__sub">
                      {formatDate(movement.date)} · saldo {formatMoney(movement.balanceAfter)}
                    </span>
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
      </AdminSection>

      <div className="banner" style={{ marginTop: '1.2rem' }}>
        <ShieldCheck size={17} style={{ flexShrink: 0 }} />
        <span>
          La información financiera de este usuario se conserva para trazabilidad. Las acciones administrativas quedan
          registradas en la auditoría.
        </span>
      </div>

      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Restablecer contraseña"
        subtitle={`Se asignará una nueva contraseña a ${fullName(user)}.`}
        footer={
          <>
            {resetError && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{resetError}</span>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void resetPassword()} disabled={resetBusy}>
              {resetBusy ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <KeyRound size={18} />}
              Restablecer contraseña
            </button>
          </>
        }
      >
        <div className="stack">
          <Field label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números.">
            <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" placeholder="Nueva contraseña" />
          </Field>
          <Field label="Confirmar contraseña">
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
            />
          </Field>
          <div className="banner banner--gold">
            <KeyRound size={17} style={{ flexShrink: 0 }} />
            <span>El usuario deberá cambiar esta contraseña al ingresar. La acción quedará en auditoría.</span>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Registrar pago manual"
        subtitle={selectedInstallment ? `Cuota ${selectedInstallment.number} · ${formatMoney(selectedInstallment.amount)}` : undefined}
        footer={
          <>
            {payError && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{payError}</span>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void registerPayment()} disabled={payBusy || !selectedInstallment}>
              {payBusy ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <CheckCircle2 size={19} />}
              Confirmar pago
            </button>
          </>
        }
      >
        <div className="stack">
          {!selectedInstallment ? (
            pendingInstallments.length === 0 ? (
              <EmptyState title="Sin cuotas pendientes" text="Este usuario no tiene cuotas por pagar." />
            ) : (
              <div className="list">
                {pendingInstallments.map(({ installment, policy }) => (
                  <button
                    key={installment.id}
                    type="button"
                    className="list-row"
                    onClick={() => setSelectedInstallment(installment)}
                  >
                    <span className="list-row__body">
                      <span className="list-row__title">
                        {policy.snapshot.name} · cuota {installment.number}
                      </span>
                      <span className="list-row__sub">Vence {formatDate(installment.dueDate)}</span>
                    </span>
                    <span className="list-row__value">{formatMoney(installment.amount)}</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <div className="card card--flat">
                <div className="summary-row">
                  <span className="summary-row__label">Usuario</span>
                  <span className="summary-row__value">{fullName(user)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row__label">Cuota</span>
                  <span className="summary-row__value">
                    {selectedInstallment.number} · vence {formatDate(selectedInstallment.dueDate)}
                  </span>
                </div>
                <div className="summary-row summary-row--total">
                  <span className="summary-row__label">Valor</span>
                  <span className="summary-row__value">{formatMoney(selectedInstallment.amount)}</span>
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
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedInstallment(null)}>
                Elegir otra cuota
              </button>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={!!paymentDetail} onClose={() => setPaymentDetail(null)} title="Detalle del pago">
        {paymentDetail && (
          <div className="card card--flat">
            <div className="summary-row">
              <span className="summary-row__label">Concepto</span>
              <span className="summary-row__value">{paymentDetail.concept}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Código</span>
              <span className="summary-row__value">{paymentDetail.code}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Valor</span>
              <span className="summary-row__value text-green">{formatMoney(paymentDetail.amount)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Fecha</span>
              <span className="summary-row__value">{formatDateTime(paymentDetail.createdAt)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Referencia</span>
              <span className="summary-row__value">{paymentDetail.reference}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Estado</span>
              <span className="summary-row__value">
                <InstallmentStatusBadge status={paymentDetail.status === 'paid' ? 'paid' : 'cancelled'} />
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Registrado por</span>
              <span className="summary-row__value">
                {state.users.find((u) => u.id === paymentDetail.registeredBy)?.firstName ?? 'Sistema'}
              </span>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar póliza"
        subtitle={cancelTarget ? `${cancelTarget.code} · ${cancelTarget.snapshot.name}` : undefined}
        footer={
          <>
            {cancelError && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{cancelError}</span>
              </div>
            )}
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => void doCancelPolicy()}
              disabled={cancelBusy}
            >
              {cancelBusy ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <Ban size={18} />}
              Confirmar cancelación
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="banner banner--red">
            <CircleAlert size={17} style={{ flexShrink: 0 }} />
            <span>
              La póliza quedará cancelada y las cuotas pendientes se anularán. Los pagos ya registrados se conservan en el
              historial contable y la acción quedará auditada.
            </span>
          </div>
          <Field label="Motivo de la cancelación" hint="Obligatorio. Se mostrará al usuario en su notificación.">
            <textarea
              className="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej. Solicitud del cliente"
            />
          </Field>
        </div>
      </Sheet>
    </>
  )
}
