import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  CreditCard,
  HandHeart,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { hasPermission } from '../../services/store'
import { initials } from '../../lib/format'
import { BrandMark } from '../ui/common'

const ITEMS = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, permission: 'dashboard.view', end: true },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users, permission: 'users.view' },
  { to: '/admin/seguros', label: 'Seguros', icon: ShieldCheck, permission: 'insurances.view' },
  { to: '/admin/pagos', label: 'Pagos', icon: CreditCard, permission: 'payments.view' },
  { to: '/admin/fondo', label: 'Fondo', icon: HandHeart, permission: 'fund.view' },
  { to: '/admin/avisos', label: 'Avisos', icon: Megaphone, permission: 'notifications.manage' },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings, permission: 'settings.manage' },
  { to: '/admin/roles', label: 'Roles', icon: KeyRound, permission: 'roles.manage' },
  { to: '/admin/auditoria', label: 'Auditoría', icon: ScrollText, permission: 'audit.view' },
]

export function AdminLayout() {
  const { session } = useAppState()
  const navigate = useNavigate()
  if (!session) return null
  const items = ITEMS.filter((item) => hasPermission(session, item.permission))

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar__inner">
          <BrandMark />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="admin-topbar__title">Panel administrativo</div>
            <div className="admin-topbar__sub">
              {session.firstName} · {session.roleName}
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Volver a la aplicación"
            onClick={() => navigate('/inicio')}
          >
            <ArrowLeftRight size={20} />
          </button>
          <div className="avatar avatar--sm avatar--gold" aria-hidden="true">
            {initials(session.firstName, session.lastName)}
          </div>
        </div>
        <nav className="admin-nav" aria-label="Secciones administrativas">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-nav__item ${isActive ? 'admin-nav__item--active' : ''}`}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </header>
      <main className="page page--admin" style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
