import { NavLink } from 'react-router-dom'
import { HandHeart, Home, ReceiptText, ShieldCheck, UserRound } from 'lucide-react'

const TABS = [
  { to: '/inicio', label: 'Inicio', icon: Home },
  { to: '/seguros', label: 'Mis seguros', icon: ShieldCheck },
  { to: '/fondo', label: 'Fondo', icon: HandHeart },
  { to: '/movimientos', label: 'Historial', icon: ReceiptText },
  { to: '/perfil', label: 'Mi perfil', icon: UserRound },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      <div className="tabbar__inner">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `tabbar__item ${isActive ? 'tabbar__item--active' : ''}`}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
