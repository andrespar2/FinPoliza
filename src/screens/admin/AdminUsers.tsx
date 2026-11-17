import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, ShieldCheck, UserRound } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { roleOfUser, computedPoliciesForUser, userFundSummary, isStaffUser } from '../../services/selectors'
import { formatDate, formatMoney, fullName, initials } from '../../lib/format'
import { AdminHeader, AdminSearch, FilterChips, NoPermission } from '../../components/admin/AdminUI'
import { EmptyState, UserStatusBadge } from '../../components/ui/common'
import { hasPermission } from '../../services/store'

type StatusFilter = 'all' | 'active' | 'suspended' | 'staff'

export function AdminUsers() {
  const state = useAppState()
  const navigate = useNavigate()
  const session = state.session!
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.users
      .filter((user) => {
        if (filter === 'active') return user.status === 'active' && !isStaffUser(state, user)
        if (filter === 'suspended') return user.status === 'suspended'
        if (filter === 'staff') return isStaffUser(state, user)
        return true
      })
      .filter((user) => {
        if (!q) return true
        return [fullName(user), user.email, user.docNumber, user.phone]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [state, query, filter])

  if (!hasPermission(session, 'users.view')) {
    return (
      <>
        <AdminHeader title="Usuarios" />
        <NoPermission permission="users.view" />
      </>
    )
  }

  const canManage = hasPermission(session, 'users.manage')
  const clients = state.users.filter((u) => !isStaffUser(state, u))

  return (
    <>
      <AdminHeader
        title="Usuarios"
        subtitle={`${clients.length} clientes registrados · ${clients.filter((u) => u.status === 'active').length} activos`}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/admin/usuarios/nuevo')}>
              <Plus size={16} /> Nuevo usuario
            </button>
          ) : undefined
        }
      />

      <div className="admin-toolbar">
        <AdminSearch value={query} onChange={setQuery} placeholder="Buscar por nombre, documento o correo" />
      </div>

      <div className="admin-tabs" style={{ marginBottom: '0.9rem' }}>
        <FilterChips<StatusFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'Todos', count: state.users.length },
            { key: 'active', label: 'Clientes activos', count: clients.filter((u) => u.status === 'active').length },
            { key: 'suspended', label: 'Suspendidos', count: state.users.filter((u) => u.status === 'suspended').length },
            { key: 'staff', label: 'Equipo', count: state.users.filter((u) => isStaffUser(state, u)).length },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<UserRound size={26} />}
          title="No encontramos usuarios"
          text="Prueba con otro término de búsqueda o cambia el filtro."
        />
      ) : (
        <>
          <div className="list">
            {rows.map((user) => {
              const role = roleOfUser(state, user)
              const policies = computedPoliciesForUser(state, user.id)
              const fund = userFundSummary(state, user.id)
              return (
                <button key={user.id} type="button" className="list-row" onClick={() => navigate(`/admin/usuarios/${user.id}`)}>
                  <span className="avatar avatar--md" style={{ width: '2.6rem', height: '2.6rem', fontSize: '0.85rem' }}>
                    {initials(user.firstName, user.lastName)}
                  </span>
                  <span className="list-row__body">
                    <span className="list-row__title">{fullName(user)}</span>
                    <span className="list-row__sub">
                      {user.docType} {user.docNumber} · {user.email}
                    </span>
                    <span className="list-row__sub">
                      {role?.name} · Desde {formatDate(user.createdAt)}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="row" style={{ justifyContent: 'flex-end', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <UserStatusBadge status={user.status} />
                    </span>
                    <span className="tiny" style={{ display: 'block' }}>
                      {policies.length} pólizas · Fondo {formatMoney(fund.balance, { compact: true })}
                    </span>
                  </span>
                  <ChevronRight size={18} className="chev" />
                </button>
              )
            })}
          </div>

          <div className="row" style={{ marginTop: '0.9rem', gap: '0.5rem' }}>
            <ShieldCheck size={15} className="dim" />
            <span className="tiny">Los datos financieros de cada usuario se conservan para auditoría contable.</span>
          </div>
        </>
      )}
    </>
  )
}
