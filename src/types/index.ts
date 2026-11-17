/**
 * FinPoliza - Modelo de datos central.
 * Todas las entidades se persisten en IndexedDB (ver src/lib/db.ts).
 */

export type ID = string
export type ISODate = string // YYYY-MM-DD
export type ISODateTime = string // ISO completo

/* ------------------------------------------------------------------ */
/* Roles y permisos                                                    */
/* ------------------------------------------------------------------ */

export type Permission =
  | 'dashboard.view'
  | 'users.view'
  | 'users.manage'
  | 'insurances.view'
  | 'insurances.manage'
  | 'payments.view'
  | 'payments.manage'
  | 'fund.view'
  | 'fund.manage'
  | 'settings.manage'
  | 'roles.manage'
  | 'audit.view'
  | 'notifications.manage'

export type RoleLevel = 'owner' | 'admin' | 'staff' | 'user'

export interface Role {
  id: ID
  name: string
  description: string
  level: RoleLevel
  permissions: Permission[]
  system: boolean // los roles de sistema no se pueden eliminar
  createdAt: ISODateTime
}

/* ------------------------------------------------------------------ */
/* Usuarios                                                            */
/* ------------------------------------------------------------------ */

export type UserStatus = 'active' | 'suspended' | 'inactive'

export interface User {
  id: ID
  firstName: string
  lastName: string
  docType: 'CC' | 'CE' | 'PA' | 'NIT'
  docNumber: string
  email: string
  phone: string
  address: string
  city: string
  birthDate: ISODate
  roleId: ID
  status: UserStatus
  passwordHash: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  lastLoginAt?: ISODateTime
  notes?: string
  mustChangePassword?: boolean
}

export interface SessionUser {
  id: ID
  firstName: string
  lastName: string
  email: string
  roleId: ID
  roleName: string
  roleLevel: RoleLevel
  permissions: Permission[]
}

/* ------------------------------------------------------------------ */
/* Seguros                                                             */
/* ------------------------------------------------------------------ */

export type Periodicity = 'monthly' | 'biweekly' | 'weekly' | 'annual' | 'single'

export interface PaymentModality {
  id: ID
  label: string
  installments: number
  periodicity: Periodicity
  /** Recargo porcentual sobre el precio base (0 = sin recargo) */
  surchargePct: number
}

export interface CoverageItem {
  label: string
  amount: number
  detail?: string
}

export interface InsuranceProduct {
  id: ID
  name: string
  category: string
  icon: string
  color: string
  shortDescription: string
  description: string
  benefits: string[]
  coverage: CoverageItem[]
  conditions: string[]
  durationMonths: number
  basePrice: number
  modalities: PaymentModality[]
  featured: boolean
  active: boolean
  archived: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/* ------------------------------------------------------------------ */
/* Pólizas y cuotas                                                    */
/* ------------------------------------------------------------------ */

export type PolicyStatus = 'active' | 'overdue' | 'completed' | 'cancelled'

export interface PolicyProductSnapshot {
  name: string
  category: string
  icon: string
  color: string
  description: string
  benefits: string[]
  coverage: CoverageItem[]
  conditions: string[]
}

export interface Policy {
  id: ID
  code: string
  userId: ID
  productId: ID
  snapshot: PolicyProductSnapshot
  modalityId: ID
  modalityLabel: string
  periodicity: Periodicity
  installmentsCount: number
  installmentAmount: number
  totalAmount: number
  status: PolicyStatus | 'pending' // pending: activa pero sin pago inicial (no se usa en el flujo actual)
  purchasedAt: ISODateTime
  startDate: ISODate
  cancelledAt?: ISODateTime
  cancelReason?: string
  createdBy: ID
}

export type InstallmentStatus = 'pending' | 'paid' | 'cancelled'

export interface Installment {
  id: ID
  policyId: ID
  userId: ID
  number: number
  amount: number
  dueDate: ISODate
  status: InstallmentStatus
  paidAt?: ISODateTime
  paymentId?: ID
}

/* ------------------------------------------------------------------ */
/* Pagos                                                               */
/* ------------------------------------------------------------------ */

export type PaymentStatus = 'paid' | 'pending' | 'cancelled'

export type PaymentMethod =
  | 'tarjeta_simulada'
  | 'pse_simulado'
  | 'efectivo'
  | 'transferencia_simulada'

export interface Payment {
  id: ID
  code: string
  userId: ID
  policyId?: ID
  installmentId?: ID
  installmentNumber?: number
  amount: number
  date: ISODate
  time: string
  status: PaymentStatus
  method: PaymentMethod
  reference: string
  registeredBy: ID
  notes?: string
  createdAt: ISODateTime
  concept: string
}

/* ------------------------------------------------------------------ */
/* Fondo solidario                                                     */
/* ------------------------------------------------------------------ */

export type FundMovementType =
  | 'deposit'
  | 'withdrawal'
  | 'adjustment_credit'
  | 'adjustment_debit'

export interface FundMovement {
  id: ID
  userId: ID
  type: FundMovementType
  amount: number
  date: ISODate
  time: string
  description: string
  balanceAfter: number
  justification?: string
  createdBy: ID
  createdAt: ISODateTime
}

/* ------------------------------------------------------------------ */
/* Notificaciones                                                      */
/* ------------------------------------------------------------------ */

export type NotificationType =
  | 'payment_due'
  | 'payment_overdue'
  | 'payment_received'
  | 'fund_deposit'
  | 'fund_withdrawal'
  | 'announcement'
  | 'welcome'
  | 'account'

export interface AppNotification {
  id: ID
  userId: ID | 'all'
  type: NotificationType
  title: string
  body: string
  createdAt: ISODateTime
  read: boolean
  /** Usuarios que marcaron como leída una notificación global. */
  readBy?: ID[]
  link?: string
  critical?: boolean
}

/* ------------------------------------------------------------------ */
/* Configuración global                                                */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  id: ID
  question: string
  answer: string
}

export interface AppSettings {
  company: {
    name: string
    legalName: string
    appName: string
    tagline: string
    description: string
    mission: string
    vision: string
    phone: string
    email: string
    address: string
    city: string
    website: string
    schedule: string
    logoUrl: string
  }
  regional: {
    currency: string
    locale: string
    dateFormat: string
    timezone: string
  }
  texts: {
    welcomeMessage: string
    helpIntro: string
    faqs: FaqItem[]
    terms: string
    privacy: string
    demoDisclaimer: string
    homeBanner: string
    loginMessage: string
  }
  fund: {
    enabled: boolean
    title: string
    description: string
    rules: string[]
    suggestedAmounts: number[]
    minDeposit: number
    minWithdrawal: number
    allowWithdrawals: boolean
    conditions: string
  }
  insurance: {
    allowPurchase: boolean
    defaultPeriodicity: Periodicity
    graceDays: number
    reminderDays: number
    showCatalogToGuests: boolean
  }
  notifications: {
    enabled: boolean
    templates: {
      welcome: string
      paymentReceived: string
      deposit: string
      withdrawal: string
      announcement: string
    }
    announcementTitle: string
    announcementBody: string
    announcementActive: boolean
  }
  features: {
    fundEnabled: boolean
    catalogEnabled: boolean
    paymentsEnabled: boolean
    registrationEnabled: boolean
    notificationsEnabled: boolean
  }
  appearance: {
    textScale: 'normal' | 'large' | 'xlarge'
  }
  updatedAt: ISODateTime
}

/* ------------------------------------------------------------------ */
/* Auditoría                                                           */
/* ------------------------------------------------------------------ */

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.status'
  | 'user.password'
  | 'user.delete'
  | 'insurance.create'
  | 'insurance.update'
  | 'insurance.archive'
  | 'insurance.delete'
  | 'payment.register'
  | 'payment.status'
  | 'fund.adjustment'
  | 'fund.settings'
  | 'settings.update'
  | 'role.update'
  | 'notification.publish'
  | 'policy.cancel'

export interface AuditLog {
  id: ID
  actorId: ID
  actorName: string
  action: AuditAction
  entity: string
  entityId: ID
  description: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  createdAt: ISODateTime
}

/* ------------------------------------------------------------------ */
/* Vistas derivadas                                                    */
/* ------------------------------------------------------------------ */

export type EffectiveInstallmentStatus =
  | 'paid'
  | 'pending'
  | 'due-soon'
  | 'overdue'
  | 'cancelled'

export interface MovementView {
  id: ID
  source: 'payment' | 'fund'
  fundType?: FundMovementType
  userId: ID
  userName: string
  title: string
  description: string
  amount: number
  /** Positivo = ingreso/entrada, negativo = salida */
  sign: 1 | -1
  date: ISODate
  time: string
  createdAt: ISODateTime
  status: PaymentStatus
  reference: string
  policyId?: ID
  policyName?: string
  installmentNumber?: number
  method?: PaymentMethod
  balanceAfter?: number
  justification?: string
}

export interface PolicyComputed {
  policy: Policy
  installments: Installment[]
  paidCount: number
  pendingCount: number
  paidAmount: number
  pendingAmount: number
  progress: number
  nextDue?: Installment
  overdueCount: number
  effectiveStatus: PolicyStatus
}
