import type {
  AppNotification,
  AppSettings,
  AuditLog,
  FundMovement,
  Installment,
  InsuranceProduct,
  Payment,
  Policy,
  Role,
  SessionUser,
  User,
} from '../types'
import { buildSeedData, seedMeta } from '../data/seed'
import { DEFAULT_SETTINGS } from '../data/defaults'
import { STORES, getMeta, getAll, withTransaction } from '../lib/db'
import { nowISO } from '../lib/dates'
import { configureFormat } from '../lib/format'
import type { StoreName, TxContext } from '../lib/db'

export interface AppState {
  status: 'loading' | 'ready' | 'error'
  error: string | null
  session: SessionUser | null
  users: User[]
  roles: Role[]
  products: InsuranceProduct[]
  policies: Policy[]
  installments: Installment[]
  payments: Payment[]
  fundMovements: FundMovement[]
  notifications: AppNotification[]
  audit: AuditLog[]
  settings: AppSettings
}

const SESSION_KEY = 'finpoliza.session.v1'
const DEMO_STORAGE_KEY = 'finpoliza.demo'
const SEED_META_KEY = 'seed_v2'

const emptyState: AppState = {
  status: 'loading',
  error: null,
  session: null,
  users: [],
  roles: [],
  products: [],
  policies: [],
  installments: [],
  payments: [],
  fundMovements: [],
  notifications: [],
  audit: [],
  settings: DEFAULT_SETTINGS,
}

type Listener = () => void

class AppStore {
  private state: AppState = emptyState
  private listeners = new Set<Listener>()
  private initPromise: Promise<void> | null = null
  private refreshPromise: Promise<void> | null = null

  getState = (): AppState => this.state

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }

  private setState(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  /** Carga única al iniciar la aplicación. */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit().catch((error: unknown) => {
        const detail =
          error instanceof Error
            ? `${error.name}: ${error.message || 'sin detalle'}`
            : String(error)
        console.error('Error al iniciar FinPoliza', error)
        this.setState({ status: 'error', error: `No se pudo preparar la información (${detail}).` })
        throw error
      })
    }
    return this.initPromise
  }

  private async doInit() {
    const seeded = await getMeta<boolean>(SEED_META_KEY)
    if (!seeded) {
      await this.seedDatabase()
    }
    await this.loadAll()
    this.setState({ status: 'ready', error: null })
    await this.restoreSession()
  }

  async seedDatabase() {
    const data = await buildSeedData()
    await withTransaction([...STORES], 'readwrite', async (tx) => {
      for (const store of STORES) await tx.clear(store)
      await tx.putMany('users', data.users)
      await tx.putMany('roles', data.roles)
      await tx.putMany('products', data.products)
      await tx.putMany('policies', data.policies)
      await tx.putMany('installments', data.installments)
      await tx.putMany('payments', data.payments)
      await tx.putMany('fundMovements', data.fundMovements)
      await tx.putMany('notifications', data.notifications)
      await tx.put('settings', { id: 'global', ...data.settings })
      await tx.put('meta', { id: SEED_META_KEY, value: true })
      await tx.put('meta', { id: 'seedInfo', value: seedMeta() })
    })
  }

  private async loadAll() {
    const [users, roles, products, policies, installments, payments, fundMovements, notifications, audit, settingsRows] =
      await Promise.all([
        getAll<User>('users'),
        getAll<Role>('roles'),
        getAll<InsuranceProduct>('products'),
        getAll<Policy>('policies'),
        getAll<Installment>('installments'),
        getAll<Payment>('payments'),
        getAll<FundMovement>('fundMovements'),
        getAll<AppNotification>('notifications'),
        getAll<AuditLog>('audit'),
        getAll<AppSettings & { id: string }>('settings'),
      ])
    const settingsRow = settingsRows.find((s) => s.id === 'global')
    if (!settingsRow) throw new Error('No se encontró la configuración global')
    const { id: _id, ...settings } = settingsRow
    configureFormat(settings.regional)
    this.applyTextScale(settings.appearance.textScale)
    this.setState({
      users,
      roles,
      products,
      policies,
      installments,
      payments,
      fundMovements,
      notifications,
      audit,
      settings,
    })
  }

  /** Recarga todos los datos desde IndexedDB (fuente de verdad). */
  refresh(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.loadAll()
        .catch((error) => {
          console.error('Error al recargar datos', error)
          throw error
        })
        .finally(() => {
          this.refreshPromise = null
        })
    }
    return this.refreshPromise
  }

  private async restoreSession() {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { userId?: string }
      const user = this.state.users.find((u) => u.id === parsed.userId)
      if (!user || user.status !== 'active') {
        localStorage.removeItem(SESSION_KEY)
        return
      }
      this.setSessionFor(user)
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  setSessionFor(user: User) {
    const role = this.state.roles.find((r) => r.id === user.roleId)
    const session: SessionUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.roleId,
      roleName: role?.name ?? 'Usuario',
      roleLevel: role?.level ?? 'user',
      permissions: role?.level === 'owner' ? [...(role?.permissions ?? [])] : [...(role?.permissions ?? [])],
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, at: nowISO() }))
    this.setState({ session })
  }

  clearSession() {
    localStorage.removeItem(SESSION_KEY)
    this.setState({ session: null })
  }

  /** Refresca el objeto de sesión (por cambios de rol o de nombre). */
  syncSession() {
    const current = this.state.session
    if (!current) return
    const user = this.state.users.find((u) => u.id === current.id)
    if (!user || user.status !== 'active') {
      this.clearSession()
      return
    }
    this.setSessionFor(user)
  }

  applyTextScale(scale: AppSettings['appearance']['textScale']) {
    const stored = localStorage.getItem('finpoliza.textScale')
    const chosen = (stored === 'normal' || stored === 'large' || stored === 'xlarge' ? stored : scale) as
      | 'normal'
      | 'large'
      | 'xlarge'
    const root = document.documentElement
    root.dataset.textScale = chosen
    const sizes: Record<string, string> = { normal: '17px', large: '18.5px', xlarge: '20px' }
    root.style.fontSize = sizes[chosen] ?? '17px'
  }

  isDemoSeed(): boolean {
    return localStorage.getItem(DEMO_STORAGE_KEY) !== 'false'
  }
}

export const store = new AppStore()

/** Transacción atómica: si algo falla, no se escribe nada. */
export async function commit<T>(
  stores: StoreName[],
  fn: (tx: TxContext) => Promise<T>,
): Promise<T> {
  return withTransaction(stores, 'readwrite', fn)
}

export function requireSession(state: AppState): SessionUser {
  if (!state.session) throw new Error('Debes iniciar sesión para continuar.')
  return state.session
}

export function hasPermission(session: SessionUser | null, permission: string): boolean {
  if (!session) return false
  if (session.roleLevel === 'owner') return true
  return session.permissions.includes(permission as never)
}

export function requirePermission(state: AppState, permission: string): SessionUser {
  const session = requireSession(state)
  if (!hasPermission(session, permission)) {
    throw new Error('No tienes permisos para realizar esta acción.')
  }
  return session
}

export function isAdmin(session: SessionUser | null): boolean {
  if (!session) return false
  return session.roleLevel === 'owner' || session.roleLevel === 'admin' || session.roleLevel === 'staff'
}

export function adminLandingPermission(session: SessionUser | null): string | null {
  if (!session) return null
  const candidates = [
    'dashboard.view',
    'users.view',
    'insurances.view',
    'payments.view',
    'fund.view',
    'settings.manage',
    'roles.manage',
    'audit.view',
  ]
  return candidates.find((p) => hasPermission(session, p)) ?? null
}

export async function persistSettings(settings: AppSettings) {
  const next = { ...settings, updatedAt: nowISO() }
  await commit(['settings'], async (tx) => {
    await tx.put('settings', { id: 'global', ...next })
  })
  configureFormat(next.regional)
  store.applyTextScale(next.appearance.textScale)
  await store.refresh()
}
