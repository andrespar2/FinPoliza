import type { Installment, Payment, PaymentMethod, Policy } from '../types'
import { addPeriod, nowISO, todayISO } from '../lib/dates'
import { formatTime } from '../lib/format'
import { uid } from '../lib/id'
import { commit, hasPermission, requireSession, store } from './store'
import { makeAudit } from './audit'
import { makeNotification } from './notifications'

export interface PurchaseResult {
  policy: Policy
  installments: Installment[]
}

export async function purchasePolicy(productId: string, modalityId: string): Promise<PurchaseResult> {
  const state = store.getState()
  const session = requireSession(state)
  if (!state.settings.features.catalogEnabled) throw new Error('El catálogo está deshabilitado temporalmente.')
  if (!state.settings.insurance.allowPurchase) throw new Error('La compra de seguros está deshabilitada en este momento.')
  const product = state.products.find((p) => p.id === productId)
  if (!product || !product.active || product.archived) throw new Error('Este seguro ya no está disponible.')
  const modality = product.modalities.find((m) => m.id === modalityId)
  if (!modality) throw new Error('Selecciona una modalidad de pago válida.')
  const user = state.users.find((u) => u.id === session.id)
  if (!user || user.status !== 'active') throw new Error('Tu cuenta no está habilitada para contratar seguros.')

  const existing = state.policies.find(
    (p) => p.userId === session.id && p.productId === productId && p.status === 'active',
  )
  if (existing) throw new Error('Ya tienes este seguro activo. Puedes consultarlo en Mis seguros.')

  const base = Math.round(product.basePrice * (1 + modality.surchargePct / 100))
  const installmentAmount = Math.max(1, Math.round(base / modality.installments))
  const totalAmount = installmentAmount * modality.installments
  const startDate = todayISO()
  const now = nowISO()
  const sequence = state.policies.length + 1
  const policyId = uid('pol')
  const policy: Policy = {
    id: policyId,
    code: `POL-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`,
    userId: session.id,
    productId: product.id,
    snapshot: {
      name: product.name,
      category: product.category,
      icon: product.icon,
      color: product.color,
      description: product.description,
      benefits: [...product.benefits],
      coverage: product.coverage.map((c) => ({ ...c })),
      conditions: [...product.conditions],
    },
    modalityId: modality.id,
    modalityLabel: modality.label,
    periodicity: modality.periodicity,
    installmentsCount: modality.installments,
    installmentAmount,
    totalAmount,
    status: 'active',
    purchasedAt: now,
    startDate,
    createdBy: session.id,
  }

  const installments: Installment[] = []
  for (let i = 1; i <= modality.installments; i += 1) {
    installments.push({
      id: uid('ins'),
      policyId,
      userId: session.id,
      number: i,
      amount: installmentAmount,
      dueDate: modality.periodicity === 'single' ? startDate : addPeriod(startDate, modality.periodicity, i),
      status: 'pending',
    })
  }

  const notification = makeNotification(session.id, {
    type: 'welcome',
    title: 'Seguro adquirido correctamente',
    body: `Tu ${product.name} quedó activo. Tu primera cuota vence el ${installments[0]?.dueDate ?? startDate}.`,
    link: `/seguros/${policyId}`,
  })

  await commit(['policies', 'installments', 'notifications'], async (tx) => {
    await tx.put('policies', policy)
    await tx.putMany('installments', installments)
    await tx.put('notifications', notification)
  })
  await store.refresh()
  return { policy, installments }
}

export interface PayInstallmentInput {
  installmentId: string
  method: PaymentMethod
  notes?: string
  /** Solo administradores: usuario titular distinto al de la sesión. */
  onBehalfOfUserId?: string
}

export async function payInstallment(input: PayInstallmentInput): Promise<Payment> {
  const state = store.getState()
  const session = requireSession(state)
  if (!state.settings.features.paymentsEnabled) throw new Error('Los pagos están deshabilitados en este momento.')
  const installment = state.installments.find((i) => i.id === input.installmentId)
  if (!installment) throw new Error('No encontramos la cuota seleccionada.')
  const policy = state.policies.find((p) => p.id === installment.policyId)
  if (!policy) throw new Error('No encontramos la póliza asociada.')
  if (policy.status === 'cancelled') throw new Error('Esta póliza está cancelada y no admite pagos.')
  const isAdminPayment = hasPermission(session, 'payments.manage')
  if (!isAdminPayment && installment.userId !== session.id) {
    throw new Error('No tienes permiso para pagar cuotas de otro usuario.')
  }
  if (installment.status === 'paid') throw new Error('Esta cuota ya fue pagada.')
  if (installment.status === 'cancelled') throw new Error('Esta cuota está cancelada.')

  const ownerId = input.onBehalfOfUserId ?? installment.userId
  if (isAdminPayment && input.onBehalfOfUserId && input.onBehalfOfUserId !== installment.userId) {
    throw new Error('La cuota no pertenece al usuario indicado.')
  }

  const now = nowISO()
  const date = todayISO()
  const time = formatTime(now)
  const paymentId = uid('pay')
  const userPolicy = state.policies.find((p) => p.id === installment.policyId)
  const payment: Payment = {
    id: paymentId,
    code: `PG-${String(Date.now()).slice(-8)}`,
    userId: ownerId,
    policyId: installment.policyId,
    installmentId: installment.id,
    installmentNumber: installment.number,
    amount: installment.amount,
    date,
    time,
    status: 'paid',
    method: input.method,
    reference: `REF-${Math.floor(100000 + Math.random() * 899999)}`,
    registeredBy: session.id,
    notes: input.notes,
    createdAt: now,
    concept: `Cuota ${installment.number} de ${policy.installmentsCount} · ${userPolicy?.snapshot.name ?? 'Seguro'}`,
  }

  const notification = makeNotification(ownerId, {
    type: 'payment_received',
    title: 'Pago registrado',
    body: `Registramos tu pago de la cuota ${installment.number} por un valor de $${installment.amount.toLocaleString('es-CO')}.`,
    link: policy ? `/seguros/${policy.id}` : '/movimientos',
  })

  const audit = isAdminPayment
    ? makeAudit(
        session,
        'payment.register',
        'Pago',
        paymentId,
        `Registró manualmente el pago de la cuota ${installment.number} de ${policy.snapshot.name}.`,
        undefined,
        { amount: installment.amount, userId: ownerId, method: input.method },
      )
    : null

  await commit(['installments', 'payments', 'notifications', 'audit'], async (tx) => {
    const fresh = await tx.get<Installment>('installments', installment.id)
    if (!fresh || fresh.status !== 'pending') {
      throw new Error('Esta cuota ya fue procesada. Actualiza la pantalla e intenta de nuevo.')
    }
    await tx.put('installments', {
      ...fresh,
      status: 'paid',
      paidAt: now,
      paymentId,
    })
    await tx.put('payments', payment)
    await tx.put('notifications', notification)
    if (audit) await tx.put('audit', audit)
  })
  await store.refresh()
  return payment
}

/** Registro manual desde el panel administrativo. */
export async function registerManualPayment(
  installmentId: string,
  method: PaymentMethod,
  notes?: string,
): Promise<Payment> {
  const state = store.getState()
  const session = requireSession(state)
  if (!hasPermission(session, 'payments.manage')) {
    throw new Error('No tienes permisos para registrar pagos.')
  }
  return payInstallment({ installmentId, method, notes })
}

export async function cancelPayment(paymentId: string, reason: string): Promise<void> {
  const state = store.getState()
  const session = requireSession(state)
  if (!hasPermission(session, 'payments.manage')) {
    throw new Error('No tienes permisos para anular pagos.')
  }
  if (!reason.trim()) throw new Error('Escribe el motivo de la anulación.')
  const payment = state.payments.find((p) => p.id === paymentId)
  if (!payment) throw new Error('El pago no existe.')
  if (payment.status === 'cancelled') throw new Error('Este pago ya está anulado.')
  const installment = state.installments.find((i) => i.id === payment.installmentId)
  const audit = makeAudit(
    session,
    'payment.status',
    'Pago',
    paymentId,
    `Anuló el pago ${payment.code}: ${reason.trim()}`,
    { status: payment.status },
    { status: 'cancelled' },
  )
  const notification = makeNotification(payment.userId, {
    type: 'account',
    title: 'Pago anulado',
    body: `El pago ${payment.code} fue anulado. Motivo: ${reason.trim()}. Si tienes dudas, contáctanos.`,
    link: '/movimientos',
  })
  await commit(['payments', 'installments', 'audit', 'notifications'], async (tx) => {
    await tx.put('payments', { ...payment, status: 'cancelled' })
    if (installment) {
      await tx.put('installments', {
        ...installment,
        status: 'pending',
        paidAt: undefined,
        paymentId: undefined,
      })
    }
    await tx.put('audit', audit)
    await tx.put('notifications', notification)
  })
  await store.refresh()
}

export async function updateInstallment(
  installmentId: string,
  patch: { amount?: number; dueDate?: string },
): Promise<void> {
  const state = store.getState()
  const session = requireSession(state)
  if (!hasPermission(session, 'payments.manage')) {
    throw new Error('No tienes permisos para modificar el calendario de pagos.')
  }
  const installment = state.installments.find((i) => i.id === installmentId)
  if (!installment) throw new Error('La cuota no existe.')
  if (installment.status === 'paid') throw new Error('No se puede modificar una cuota pagada.')
  if (patch.amount !== undefined && (!Number.isFinite(patch.amount) || patch.amount <= 0)) {
    throw new Error('El valor de la cuota debe ser mayor que cero.')
  }
  if (patch.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate)) {
    throw new Error('La fecha de vencimiento no es válida.')
  }
  const updated: Installment = {
    ...installment,
    amount: patch.amount ?? installment.amount,
    dueDate: patch.dueDate ?? installment.dueDate,
  }
  const policy = state.policies.find((p) => p.id === installment.policyId)
  const policyInstallments = state.installments.filter((i) => i.policyId === installment.policyId)
  const newTotal = policyInstallments.reduce(
    (sum, i) => sum + (i.id === installment.id ? updated.amount : i.amount),
    0,
  )
  const audit = makeAudit(
    session,
    'payment.status',
    'Cuota',
    installment.id,
    `Modificó la cuota ${installment.number} de ${policy?.snapshot.name ?? 'un seguro'}.`,
    { amount: installment.amount, dueDate: installment.dueDate },
    { amount: updated.amount, dueDate: updated.dueDate },
  )
  await commit(['installments', 'policies', 'audit'], async (tx) => {
    await tx.put('installments', updated)
    if (policy) await tx.put('policies', { ...policy, totalAmount: newTotal })
    await tx.put('audit', audit)
  })
  await store.refresh()
}

export async function cancelPolicy(policyId: string, reason: string): Promise<void> {
  const state = store.getState()
  const session = requireSession(state)
  const canCancel = hasPermission(session, 'insurances.manage') || hasPermission(session, 'payments.manage')
  if (!canCancel) throw new Error('No tienes permisos para cancelar pólizas.')
  if (!reason.trim()) throw new Error('Escribe el motivo de la cancelación.')
  const policy = state.policies.find((p) => p.id === policyId)
  if (!policy) throw new Error('La póliza no existe.')
  if (policy.status === 'cancelled') throw new Error('La póliza ya está cancelada.')
  const now = nowISO()
  const pending = state.installments.filter((i) => i.policyId === policyId && i.status === 'pending')
  const audit = makeAudit(
    session,
    'policy.cancel',
    'Póliza',
    policyId,
    `Canceló la póliza ${policy.code} (${policy.snapshot.name}).`,
    { status: policy.status },
    { status: 'cancelled', reason: reason.trim() },
  )
  const notification = makeNotification(policy.userId, {
    type: 'account',
    title: 'Póliza cancelada',
    body: `Tu póliza ${policy.code} fue cancelada. Motivo: ${reason.trim()}.`,
    link: '/seguros',
  })
  await commit(['policies', 'installments', 'audit', 'notifications'], async (tx) => {
    await tx.put('policies', { ...policy, status: 'cancelled', cancelledAt: now, cancelReason: reason.trim() })
    for (const inst of pending) {
      await tx.put('installments', { ...inst, status: 'cancelled' })
    }
    await tx.put('audit', audit)
    await tx.put('notifications', notification)
  })
  await store.refresh()
}
