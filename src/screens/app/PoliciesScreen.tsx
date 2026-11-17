import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ShieldCheck } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { computedPoliciesForUser } from '../../services/selectors'
import { formatMoney } from '../../lib/format'
import { EmptyState, ScreenHeader } from '../../components/ui/common'
import { PolicyCard } from '../../components/app/PolicyCard'

type Filter = 'all' | 'active' | 'overdue' | 'completed' | 'cancelled'

export function PoliciesScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const session = state.session!
  const [filter, setFilter] = useState<Filter>('all')
  const policies = useMemo(() => computedPoliciesForUser(state, session.id), [state, session.id])

  const filtered = policies.filter((p) => {
    if (filter === 'all') return true
    if (filter === 'active') return p.effectiveStatus === 'active'
    return p.effectiveStatus === filter
  })

  const pendingTotal = policies
    .filter((p) => p.effectiveStatus !== 'cancelled')
    .reduce((sum, p) => sum + p.pendingAmount, 0)

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: policies.length },
    { key: 'active', label: 'Activos', count: policies.filter((p) => p.effectiveStatus === 'active').length },
    { key: 'overdue', label: 'En mora', count: policies.filter((p) => p.effectiveStatus === 'overdue').length },
    {
      key: 'completed',
      label: 'Completados',
      count: policies.filter((p) => p.effectiveStatus === 'completed').length,
    },
  ]

  return (
    <div className="page">
      <ScreenHeader
        title="Mis seguros"
        subtitle={`${policies.length} ${policies.length === 1 ? 'póliza contratada' : 'pólizas contratadas'} · ${formatMoney(pendingTotal)} por pagar`}
        actions={
          <button
            type="button"
            className="icon-btn"
            aria-label="Ir al catálogo de seguros"
            onClick={() => navigate('/catalogo')}
          >
            <BookOpen size={20} />
          </button>
        }
      />

      <div className="segmented" style={{ marginBottom: '1rem', overflowX: 'auto' }}>
        <button type="button" className="segmented__item segmented__item--active">
          Mis seguros
        </button>
        <button type="button" className="segmented__item" onClick={() => navigate('/catalogo')}>
          Catálogo
        </button>
      </div>

      {policies.length > 0 && (
        <div className="chip-row" style={{ marginBottom: '1rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip chip--button ${filter === f.key ? 'chip--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} · {f.count}
            </button>
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="stack">
          {filtered.map((computed) => (
            <PolicyCard
              key={computed.policy.id}
              computed={computed}
              onClick={() => navigate(`/seguros/${computed.policy.id}`)}
            />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title="Aún no tienes seguros"
          text="Explora nuestro catálogo y elige la protección que mejor se adapte a ti y a tu familia."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/catalogo')}>
              Ver catálogo de seguros
            </button>
          }
        />
      ) : (
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title="No hay pólizas en este filtro"
          text="Prueba con otro estado para ver tus seguros."
          action={
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setFilter('all')}>
              Ver todos
            </button>
          }
        />
      )}
    </div>
  )
}
