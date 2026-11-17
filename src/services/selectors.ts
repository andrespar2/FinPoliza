import type {
  AppNotification,
  AuditLog,
  EffectiveInstallmentStatus,
  FundMovement,
  Installment,
  InsuranceProduct,
  MovementView,
  Payment,
  Policy,
  PolicyComputed,
  PolicyStatus,
  Role,
  SessionUser,
  User,
} from '../types'
import type { AppState } from './store'
import { daysFromToday, diffInDays, lastMonths, todayISO } from '../lib/dates'
import { fullName, percent } from '../lib/format'
import { hasPermission } from './store'

export function userById(state: AppState, id: string): User | undefined {
  return state.users.find((u) => u.id === id)
}

export function roleById(state: AppState, id: string): Role | undefined {
  return state.roles.find((r) => r.id === id)
}

export function roleOfUser(state: AppState, user: User | null | undefined): Role | undefined {
  if (!user) return undefined
  return state.roles.find((r) => r.id === user.roleId)
}

export function productById(state: AppState, id: string): InsuranceProduct | undefined {
  return state.products.find((p) => p.id === id)
}

export function userName(state: AppState, id: string): string {
  const user = userById(state, id)
  return user ? fullName(user) : 'Usuario eliminado'
}

export function availableProducts(state: AppState): InsuranceProduct[] {
  return state.products
    .filter((p) => p.active && !p.archived)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
}

/** Estado efectivo de una cuota (vencida / por vencer / pendiente). */
export function effectiveInstallmentStatus(
  inst: Installment,
  reminderDays = 7,
): EffectiveInstallmentStatus {
  if (inst.status === 'paid') return 'paid'
  if (inst.status === 'cancelled') return 'cancelled'
  const days = daysFromToday(inst.dueDate)
  if (days < 0) return 'overdue'
  if (days <= reminderDays) return 'due-soon'
  return 'pending'
}

export function isInstallmentPayable(inst: Installment): boolean {
  return inst.status === 'pending'
}

export function computePolicy(policy: Policy, allInstallments: Installment[], reminderDays = 7): PolicyComputed {
  const installments = allInstallments
    .filter((i) => i.policyId === policy.id)
    .sort((a, b) => a.number - b.number)
  const valid = installments.filter((i) => i.status !== 'cancelled')
  const paid = valid.filter((i) => i.status === 'paid')
  const paidAmount = paid.reduce((sum, i) => sum + i.amount, 0)
  const pendingList = valid.filter((i) => i.status === 'pending')
  const pendingAmount = pendingList.reduce((sum, i) => sum + i.amount, 0)
  const overdue = pendingList.filter((i) => effectiveInstallmentStatus(i, reminderDays) === 'overdue')
  const nextDue = pendingList
    .slice()
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0]

  let effectiveStatus: PolicyStatus
  if (policy.status === 'cancelled') effectiveStatus = 'cancelled'
  else if (pendingList.length === 0) effectiveStatus = 'completed'
  else if (overdue.length > 0) effectiveStatus = 'overdue'
  else effectiveStatus = 'active'

  return {
    policy,
    installments,
    paidCount: paid.length,
    pendingCount: pendingList.length,
    paidAmount,
    pendingAmount,
    progress: percent(paidAmount, paidAmount + pendingAmount),
    nextDue,
    overdueCount: overdue.length,
    effectiveStatus,
  }
}

export function policiesForUser(state: AppState, userId: string): Policy[] {
  return state.policies
    .filter((p) => p.userId === userId)
    .sort((a, b) => (a.purchasedAt < b.purchasedAt ? 1 : -1))
}

export function computedPoliciesForUser(state: AppState, userId: string): PolicyComputed[] {
  return policiesForUser(state, userId).map((p) =>
    computePolicy(p, state.installments, state.settings.insurance.reminderDays),
  )
}

export function installmentsForPolicy(state: AppState, policyId: string): Installment[] {
  return state.installments
    .filter((i) => i.policyId === policyId)
    .sort((a, b) => a.number - b.number)
}

export function paymentsForUser(state: AppState, userId: string): Payment[] {
  return state.payments
    .filter((p) => p.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/* ------------------------------------------------------------------ */
/* Fondo solidario                                                     */
/* ------------------------------------------------------------------ */

export function fundMovementsForUser(state: AppState, userId: string): FundMovement[] {
  return state.fundMovements
    .filter((m) => m.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export interface FundSummary {
  deposits: number
  withdrawals: number
  adjustmentsCredit: number
  adjustmentsDebit: number
  balance: number
  lastMovement?: FundMovement
  movementCount: number
}

export function fundSummary(movements: FundMovement[]): FundSummary {
  let deposits = 0
  let withdrawals = 0
  let adjustmentsCredit = 0
  let adjustmentsDebit = 0
  for (const m of movements) {
    if (m.type === 'deposit') deposits += m.amount
    if (m.type === 'withdrawal') withdrawals += m.amount
    if (m.type === 'adjustment_credit') adjustmentsCredit += m.amount
    if (m.type === 'adjustment_debit') adjustmentsDebit += m.amount
  }
  const sorted = movements.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return {
    deposits,
    withdrawals,
    adjustmentsCredit,
    adjustmentsDebit,
    balance: Math.max(0, deposits + adjustmentsCredit - withdrawals - adjustmentsDebit),
    lastMovement: sorted[0],
    movementCount: movements.length,
  }
}

export function userFundSummary(state: AppState, userId: string): FundSummary {
  return fundSummary(fundMovementsForUser(state, userId))
}

export function fundConsolidated(state: AppState): FundSummary {
  return fundSummary(state.fundMovements)
}

/* ------------------------------------------------------------------ */
/* Movimientos unificados                                              */
/* ------------------------------------------------------------------ */

export function buildMovements(state: AppState, userId?: string): MovementView[] {
  const rows: MovementView[] = []
  const methods: Record<Payment['method'], string> = {
    tarjeta_simulada: 'Tarjeta simulada',
    pse_simulado: 'PSE simulado',
    efectivo: 'Efectivo',
    transferencia_simulada: 'Transferencia simulada',
  }

  for (const payment of state.payments) {
    if (userId && payment.userId !== userId) continue
    const policy = state.policies.find((p) => p.id === payment.policyId)
    rows.push({
      id: `mov_${payment.id}`,
      source: 'payment',
      userId: payment.userId,
      userName: userName(state, payment.userId),
      title: payment.concept,
      description: `${methods[payment.method]} · ${payment.reference}`,
      amount: payment.amount,
      sign: -1,
      date: payment.date,
      time: payment.time,
      createdAt: payment.createdAt,
      status: payment.status,
      reference: payment.reference,
      policyId: payment.policyId,
      policyName: policy?.snapshot.name ?? payment.concept,
      installmentNumber: payment.installmentNumber,
      method: payment.method,
    })
  }

  for (const mov of state.fundMovements) {
    if (userId && mov.userId !== userId) continue
    const isIncoming = mov.type === 'deposit' || mov.type === 'adjustment_credit'
    rows.push({
      id: `mov_${mov.id}`,
      source: 'fund',
      fundType: mov.type,
      userId: mov.userId,
      userName: userName(state, mov.userId),
      title:
        mov.type === 'deposit'
          ? 'Aportación al fondo solidario'
          : mov.type === 'withdrawal'
            ? 'Retiro del fondo solidario'
            : mov.type === 'adjustment_credit'
              ? 'Ajuste a favor'
              : 'Ajuste en contra',
      description: mov.description,
      amount: mov.amount,
      sign: isIncoming ? 1 : -1,
      date: mov.date,
      time: mov.time,
      createdAt: mov.createdAt,
      status: 'paid',
      reference: mov.id.slice(-8).toUpperCase(),
      balanceAfter: mov.balanceAfter,
      justification: mov.justification,
    })
  }

  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
}

export function movementsForUser(state: AppState, userId: string): MovementView[] {
  return buildMovements(state, userId)
}

/* ------------------------------------------------------------------ */
/* Resumen del usuario                                                 */
/* ------------------------------------------------------------------ */

export interface UserDashboard {
  policies: PolicyComputed[]
  activePolicies: number
  nextPayment?: { installment: Installment; policy: Policy; computed: PolicyComputed }
  totalPending: number
  overdueCount: number
  paidTotal: number
  fund: FundSummary
  recentMovements: MovementView[]
  unreadNotifications: number
}

export function userDashboard(state: AppState, userId: string): UserDashboard {
  const policies = computedPoliciesForUser(state, userId)
  const active = policies.filter((p) => p.effectiveStatus === 'active' || p.effectiveStatus === 'overdue')
  const pendingInstallments = active
    .flatMap((p) => p.installments.filter((i) => i.status === 'pending').map((i) => ({ installment: i, computed: p })))
    .sort((a, b) => (a.installment.dueDate < b.installment.dueDate ? -1 : 1))
  const first = pendingInstallments[0]
  const notifications = state.notifications.filter(
    (n) => n.userId === userId || n.userId === 'all',
  )

  return {
    policies,
    activePolicies: active.length,
    nextPayment: first
      ? { installment: first.installment, policy: first.computed.policy, computed: first.computed }
      : undefined,
    totalPending: active.reduce((sum, p) => sum + p.pendingAmount, 0),
    overdueCount: active.reduce((sum, p) => sum + p.overdueCount, 0),
    paidTotal: policies.reduce((sum, p) => sum + p.paidAmount, 0),
    fund: userFundSummary(state, userId),
    recentMovements: movementsForUser(state, userId).slice(0, 4),
    unreadNotifications: notifications.filter((n) => !isNotificationRead(n, userId)).length,
  }
}

export function isNotificationRead(notification: AppNotification, userId: string): boolean {
  if (notification.userId === 'all') return notification.readBy?.includes(userId) ?? notification.read
  return notification.read
}

/* ------------------------------------------------------------------ */
/* Administración                                                      */
/* ------------------------------------------------------------------ */

export function canAccessAdmin(session: SessionUser | null): boolean {
  if (!session) return false
  return (
    hasPermission(session, 'dashboard.view') ||
    hasPermission(session, 'users.view') ||
    hasPermission(session, 'insurances.view') ||
    hasPermission(session, 'payments.view') ||
    hasPermission(session, 'fund.view') ||
    hasPermission(session, 'settings.manage') ||
    hasPermission(session, 'roles.manage') ||
    hasPermission(session, 'audit.view')
  )
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  availableProducts: number
  activePolicies: number
  totalCollected: number
  periodCollected: number
  pendingAmount: number
  overdueAmount: number
  overdueCount: number
  fundDeposits: number
  fundWithdrawals: number
  fundBalance: number
  periodFundIn: number
  periodFundOut: number
  monthly: { label: string; payments: number; deposits: number; withdrawals: number }[]
  topProducts: { product: InsuranceProduct; count: number; amount: number }[]
  policiesByStatus: { status: PolicyStatus; count: number }[]
  recentPayments: Payment[]
  pendingInstallments: { installment: Installment; policy: Policy; user?: User }[]
  totalInsured: number
}

export function adminStats(state: AppState, range: { from: string; to: string }): AdminStats {
  const { from, to } = range
  const reminder = state.settings.insurance.reminderDays
  const inRange = (date: string) => date >= from && date <= to
  const paidPayments = state.payments.filter((p) => p.status === 'paid')
  const computedPolicies = state.policies.map((p) => computePolicy(p, state.installments, reminder))
  const activeComputed = computedPolicies.filter(
    (p) => p.effectiveStatus === 'active' || p.effectiveStatus === 'overdue',
  )

  const pendingInstallments = activeComputed
    .flatMap((p) =>
      p.installments
        .filter((i) => i.status === 'pending' && effectiveInstallmentStatus(i, reminder) !== 'overdue')
        .map((i) => ({ installment: i, policy: p.policy, user: userById(state, i.userId) })),
    )
    .sort((a, b) => (a.installment.dueDate < b.installment.dueDate ? -1 : 1))

  const overdueInstallments = activeComputed.flatMap((p) =>
    p.installments.filter((i) => i.status === 'pending' && effectiveInstallmentStatus(i, reminder) === 'overdue'),
  )

  const fund = fundConsolidated(state)
  const periodFundIn = state.fundMovements
    .filter((m) => inRange(m.date) && (m.type === 'deposit' || m.type === 'adjustment_credit'))
    .reduce((sum, m) => sum + m.amount, 0)
  const periodFundOut = state.fundMovements
    .filter((m) => inRange(m.date) && (m.type === 'withdrawal' || m.type === 'adjustment_debit'))
    .reduce((sum, m) => sum + m.amount, 0)

  const months = lastMonths(6)
  const monthly = months.map((m) => ({
    label: m.label,
    payments: paidPayments.filter((p) => p.date >= m.from && p.date <= m.to).reduce((s, p) => s + p.amount, 0),
    deposits: state.fundMovements
      .filter((f) => f.date >= m.from && f.date <= m.to && (f.type === 'deposit' || f.type === 'adjustment_credit'))
      .reduce((s, f) => s + f.amount, 0),
    withdrawals: state.fundMovements
      .filter((f) => f.date >= m.from && f.date <= m.to && (f.type === 'withdrawal' || f.type === 'adjustment_debit'))
      .reduce((s, f) => s + f.amount, 0),
  }))

  const productCounts = new Map<string, { count: number; amount: number }>()
  for (const policy of state.policies) {
    const current = productCounts.get(policy.productId) ?? { count: 0, amount: 0 }
    productCounts.set(policy.productId, { count: current.count + 1, amount: current.amount + policy.totalAmount })
  }
  const topProducts = [...productCounts.entries()]
    .map(([productId, value]) => ({
      product: productById(state, productId) ?? state.products[0],
      ...value,
    }))
    .filter((x) => Boolean(x.product))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const statuses: PolicyStatus[] = ['active', 'overdue', 'completed', 'cancelled']
  const policiesByStatus = statuses.map((status) => ({
    status,
    count: computedPolicies.filter((p) => p.effectiveStatus === status).length,
  }))

  return {
    totalUsers: state.users.filter((u) => !isStaffUser(state, u)).length,
    activeUsers: state.users.filter((u) => u.status === 'active' && !isStaffUser(state, u)).length,
    suspendedUsers: state.users.filter((u) => u.status === 'suspended').length,
    availableProducts: state.products.filter((p) => p.active && !p.archived).length,
    activePolicies: activeComputed.length,
    totalCollected: paidPayments.reduce((sum, p) => sum + p.amount, 0),
    periodCollected: paidPayments.filter((p) => inRange(p.date)).reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: pendingInstallments.reduce((sum, i) => sum + i.installment.amount, 0),
    overdueAmount: overdueInstallments.reduce((sum, i) => sum + i.amount, 0),
    overdueCount: overdueInstallments.length,
    fundDeposits: fund.deposits + fund.adjustmentsCredit,
    fundWithdrawals: fund.withdrawals + fund.adjustmentsDebit,
    fundBalance: fund.balance,
    periodFundIn,
    periodFundOut,
    monthly,
    topProducts,
    policiesByStatus,
    recentPayments: paidPayments
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 6),
    pendingInstallments: pendingInstallments.slice(0, 8),
    totalInsured: state.policies
      .filter((p) => p.status !== 'cancelled')
      .reduce((sum, p) => sum + p.snapshot.coverage.reduce((s, c) => s + c.amount, 0), 0),
  }
}

export function isStaffUser(state: AppState, user: User): boolean {
  const role = roleById(state, user.roleId)
  return role ? role.level !== 'user' : false
}

export function clientUsers(state: AppState): User[] {
  return state.users
    .filter((u) => !isStaffUser(state, u))
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
}

export function searchUsers(state: AppState, query: string): User[] {
  const q = query.trim().toLowerCase()
  if (!q) return clientUsers(state)
  return clientUsers(state).filter((u) =>
    [fullName(u), u.email, u.docNumber, u.phone, u.city]
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
}

export function notificationsForUser(state: AppState, userId: string): AppNotification[] {
  return state.notifications
    .filter((n) => n.userId === userId || n.userId === 'all')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function auditLogs(state: AppState) {
  return state.audit
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 500)
}

export function nextDueLabel(dueDate: string): string {
  const days = daysFromToday(dueDate)
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  if (days < 0) {
    const n = Math.abs(days)
    return `Vencida hace ${n} ${n === 1 ? 'día' : 'días'}`
  }
  return `Vence en ${days} ${days === 1 ? 'día' : 'días'}`
}

export function dueDateUrgency(dueDate: string, reminderDays = 7): 'ok' | 'soon' | 'late' {
  const days = daysFromToday(dueDate)
  if (days < 0) return 'late'
  if (days <= reminderDays) return 'soon'
  return 'ok'
}

export function isWithinDays(date: string, days: number): boolean {
  const diff = diffInDays(date, todayISO())
  return Math.abs(diff) <= days
}

export function auditActionLabel(action: AuditLog['action']): string {
  const labels: Record<AuditLog['action'], string> = {
    'user.create': 'Creación de usuario',
    'user.update': 'Actualización de usuario',
    'user.status': 'Cambio de estado de cuenta',
    'user.password': 'Restablecimiento de contraseña',
    'user.delete': 'Eliminación de usuario',
    'insurance.create': 'Creación de seguro',
    'insurance.update': 'Actualización de seguro',
    'insurance.archive': 'Archivo de seguro',
    'insurance.delete': 'Eliminación de seguro',
    'payment.register': 'Registro de pago',
    'payment.status': 'Cambio de estado de pago',
    'fund.adjustment': 'Ajuste de fondo solidario',
    'fund.settings': 'Configuración del fondo',
    'settings.update': 'Configuración global',
    'role.update': 'Actualización de rol',
    'notification.publish': 'Publicación de aviso',
    'policy.cancel': 'Cancelación de póliza',
  }
  return labels[action] ?? action
}
