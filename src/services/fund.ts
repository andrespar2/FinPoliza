import type { FundMovement, FundMovementType } from '../types'
import { nowISO, todayISO } from '../lib/dates'
import { formatMoney, formatTime } from '../lib/format'
import { uid } from '../lib/id'
import { commit, hasPermission, requireSession, store } from './store'
import { makeAudit } from './audit'
import { makeNotification } from './notifications'

function timeNow(): string {
  return formatTime(nowISO())
}

function balanceFrom(movements: FundMovement[]): number {
  return movements.reduce((sum, m) => {
    if (m.type === 'deposit' || m.type === 'adjustment_credit') return sum + m.amount
    return sum - m.amount
  }, 0)
}

export interface FundOperationResult {
  movement: FundMovement
  balance: number
}

export async function depositToFund(amount: number): Promise<FundOperationResult> {
  const state = store.getState()
  const session = requireSession(state)
  if (!state.settings.fund.enabled || !state.settings.features.fundEnabled) {
    throw new Error('El fondo solidario está deshabilitado temporalmente.')
  }
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Ingresa un valor mayor que cero.')
  if (amount < state.settings.fund.minDeposit) {
    throw new Error(`La aportación mínima es de ${formatMoney(state.settings.fund.minDeposit)}.`)
  }
  const user = state.users.find((u) => u.id === session.id)
  if (!user || user.status !== 'active') throw new Error('Tu cuenta no está habilitada para esta operación.')

  const now = nowISO()
  const movement: FundMovement = {
    id: uid('fnd'),
    userId: session.id,
    type: 'deposit',
    amount,
    date: todayISO(),
    time: timeNow(),
    description: 'Aportación voluntaria al fondo solidario',
    balanceAfter: 0,
    createdBy: session.id,
    createdAt: now,
  }

  const notification = makeNotification(session.id, {
    type: 'fund_deposit',
    title: 'Aportación registrada',
    body: `Recibimos tu aportación de ${formatMoney(amount)} al Fondo Solidario.`,
    link: '/fondo',
  })

  let balance = 0
  await commit(['fundMovements', 'notifications'], async (tx) => {
    const existing = await tx.getAll<FundMovement>('fundMovements')
    const userMovements = existing.filter((m) => m.userId === session.id)
    balance = Math.max(0, balanceFrom(userMovements))
    const updatedMovement: FundMovement = { ...movement, balanceAfter: balance + amount }
    balance += amount
    await tx.put('fundMovements', updatedMovement)
    await tx.put('notifications', notification)
    movement.balanceAfter = balance
  })
  await store.refresh()
  return { movement, balance }
}

export async function withdrawFromFund(amount: number): Promise<FundOperationResult> {
  const state = store.getState()
  const session = requireSession(state)
  if (!state.settings.fund.enabled || !state.settings.features.fundEnabled) {
    throw new Error('El fondo solidario está deshabilitado temporalmente.')
  }
  if (!state.settings.fund.allowWithdrawals) {
    throw new Error('Los retiros están deshabilitados por la compañía en este momento.')
  }
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Ingresa un valor mayor que cero.')
  if (amount < state.settings.fund.minWithdrawal) {
    throw new Error(`El retiro mínimo es de ${formatMoney(state.settings.fund.minWithdrawal)}.`)
  }
  const user = state.users.find((u) => u.id === session.id)
  if (!user || user.status !== 'active') throw new Error('Tu cuenta no está habilitada para esta operación.')

  const now = nowISO()
  const movement: FundMovement = {
    id: uid('fnd'),
    userId: session.id,
    type: 'withdrawal',
    amount,
    date: todayISO(),
    time: timeNow(),
    description: 'Retiro del fondo solidario',
    balanceAfter: 0,
    createdBy: session.id,
    createdAt: now,
  }

  const notification = makeNotification(session.id, {
    type: 'fund_withdrawal',
    title: 'Retiro procesado',
    body: `Procesamos tu retiro de ${formatMoney(amount)}. Tu nuevo saldo está actualizado.`,
    link: '/fondo',
  })

  let balance = 0
  await commit(['fundMovements', 'notifications'], async (tx) => {
    const existing = await tx.getAll<FundMovement>('fundMovements')
    const userMovements = existing.filter((m) => m.userId === session.id)
    const available = Math.max(0, balanceFrom(userMovements))
    if (amount > available) {
      throw new Error(`El valor supera tu saldo disponible (${formatMoney(available)}).`)
    }
    await tx.put('fundMovements', { ...movement, balanceAfter: available - amount })
    await tx.put('notifications', notification)
    balance = available - amount
    movement.balanceAfter = balance
  })
  await store.refresh()
  return { movement, balance }
}

export async function adminFundAdjustment(
  userId: string,
  type: Extract<FundMovementType, 'adjustment_credit' | 'adjustment_debit'>,
  amount: number,
  justification: string,
): Promise<void> {
  const state = store.getState()
  const session = requireSession(state)
  if (!hasPermission(session, 'fund.manage')) throw new Error('No tienes permisos para ajustar el fondo.')
  const target = state.users.find((u) => u.id === userId)
  if (!target) throw new Error('El usuario no existe.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('El valor del ajuste debe ser mayor que cero.')
  if (justification.trim().length < 10) {
    throw new Error('La justificación es obligatoria y debe tener al menos 10 caracteres.')
  }
  const now = nowISO()
  const movement: FundMovement = {
    id: uid('fnd'),
    userId,
    type,
    amount,
    date: todayISO(),
    time: timeNow(),
    description:
      type === 'adjustment_credit' ? 'Ajuste administrativo a favor' : 'Ajuste administrativo en contra',
    balanceAfter: 0,
    justification: justification.trim(),
    createdBy: session.id,
    createdAt: now,
  }
  const audit = makeAudit(
    session,
    'fund.adjustment',
    'Fondo solidario',
    movement.id,
    `${type === 'adjustment_credit' ? 'Acreditó' : 'Debitó'} ${formatMoney(amount)} a ${target.firstName} ${target.lastName}. Justificación: ${justification.trim()}`,
    undefined,
    { userId, type, amount, justification: justification.trim() },
  )
  const notification = makeNotification(userId, {
    type: 'fund_deposit',
    title: type === 'adjustment_credit' ? 'Ajuste a favor registrado' : 'Ajuste en contra registrado',
    body: `Se registró un ajuste ${type === 'adjustment_credit' ? 'a favor' : 'en contra'} por ${formatMoney(amount)} en tu fondo solidario.`,
    link: '/fondo',
  })
  await commit(['fundMovements', 'audit', 'notifications'], async (tx) => {
    const existing = await tx.getAll<FundMovement>('fundMovements')
    const userMovements = existing.filter((m) => m.userId === userId)
    const available = Math.max(0, balanceFrom(userMovements))
    if (type === 'adjustment_debit' && amount > available) {
      throw new Error(`El débito supera el saldo disponible del usuario (${formatMoney(available)}).`)
    }
    const next = type === 'adjustment_credit' ? available + amount : available - amount
    await tx.put('fundMovements', { ...movement, balanceAfter: next })
    await tx.put('audit', audit)
    await tx.put('notifications', notification)
  })
  await store.refresh()
}

export function fundTypeLabel(type: FundMovementType): string {
  const labels: Record<FundMovementType, string> = {
    deposit: 'Aportación',
    withdrawal: 'Retiro',
    adjustment_credit: 'Ajuste a favor',
    adjustment_debit: 'Ajuste en contra',
  }
  return labels[type]
}
