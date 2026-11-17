import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  BadgeCheck,
  Edit3,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { deleteProduct, setProductAvailability } from '../../services/insurances'
import { formatMoney } from '../../lib/format'
import { AdminHeader, AdminSearch, FilterChips, NoPermission } from '../../components/admin/AdminUI'
import { EmptyState, ProductIcon } from '../../components/ui/common'
import { useConfirm, useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'

type Filter = 'all' | 'active' | 'featured' | 'archived'

export function AdminInsurances() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const session = state.session!
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const products = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.products
      .filter((p) => {
        if (filter === 'active') return p.active && !p.archived
        if (filter === 'featured') return p.featured && !p.archived
        if (filter === 'archived') return p.archived
        return true
      })
      .filter((p) => !q || `${p.name} ${p.category} ${p.shortDescription}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
  }, [state.products, query, filter])

  if (!hasPermission(session, 'insurances.view')) {
    return (
      <>
        <AdminHeader title="Seguros" />
        <NoPermission permission="insurances.view" />
      </>
    )
  }

  const canManage = hasPermission(session, 'insurances.manage')

  const toggle = async (id: string, patch: { active?: boolean; archived?: boolean; featured?: boolean }, message: string) => {
    try {
      await setProductAvailability(id, patch)
      toast.success(message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el seguro.')
    }
  }

  const remove = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Eliminar seguro',
      message: `¿Deseas eliminar "${name}"? Si ya tiene pólizas contratadas deberás archivarlo en su lugar.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteProduct(id)
      toast.success('Seguro eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el seguro.')
    }
  }

  return (
    <>
      <AdminHeader
        title="Seguros"
        subtitle={`${state.products.filter((p) => p.active && !p.archived).length} disponibles · ${state.policies.length} pólizas contratadas`}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/admin/seguros/nuevo')}>
              <Plus size={16} /> Nuevo seguro
            </button>
          ) : undefined
        }
      />

      <div className="admin-toolbar">
        <AdminSearch value={query} onChange={setQuery} placeholder="Buscar seguro por nombre o categoría" />
      </div>

      <div className="admin-tabs" style={{ marginBottom: '0.9rem' }}>
        <FilterChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'Todos', count: state.products.length },
            { key: 'active', label: 'Disponibles', count: state.products.filter((p) => p.active && !p.archived).length },
            { key: 'featured', label: 'Destacados', count: state.products.filter((p) => p.featured && !p.archived).length },
            { key: 'archived', label: 'Archivados', count: state.products.filter((p) => p.archived).length },
          ]}
        />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={26} />}
          title="No encontramos seguros"
          text="Ajusta la búsqueda o crea un nuevo seguro para el catálogo."
          action={
            canManage ? (
              <button type="button" className="btn btn--primary" onClick={() => navigate('/admin/seguros/nuevo')}>
                <Plus size={18} /> Crear seguro
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="stack">
          {products.map((product) => {
            const policyCount = state.policies.filter((p) => p.productId === product.id).length
            return (
              <div key={product.id} className="card">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <ProductIcon name={product.icon} color={product.color} size={1.7} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="strong">{product.name}</span>
                      {product.featured && (
                        <span className="featured-ribbon">
                          <Sparkles size={11} /> Destacado
                        </span>
                      )}
                      {product.archived ? (
                        <span className="badge badge--neutral">
                          <Archive size={11} /> Archivado
                        </span>
                      ) : product.active ? (
                        <span className="badge badge--green">Disponible</span>
                      ) : (
                        <span className="badge badge--red">Desactivado</span>
                      )}
                    </div>
                    <div className="tiny" style={{ marginTop: '0.15rem' }}>
                      {product.category} · {product.modalities.length} modalidades · {policyCount}{' '}
                      {policyCount === 1 ? 'póliza' : 'pólizas'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="strong money">{formatMoney(product.basePrice)}</div>
                    <div className="tiny">{product.durationMonths} meses</div>
                  </div>
                </div>

                <div className="row" style={{ marginTop: '0.8rem', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => navigate(`/admin/seguros/${product.id}/editar`)}
                      >
                        <Edit3 size={15} /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() =>
                          void toggle(
                            product.id,
                            { active: !product.active },
                            product.active ? 'Seguro desactivado.' : 'Seguro activado.',
                          )
                        }
                      >
                        <BadgeCheck size={15} /> {product.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() =>
                          void toggle(
                            product.id,
                            { featured: !product.featured },
                            product.featured ? 'Retirado de destacados.' : 'Seguro destacado.',
                          )
                        }
                      >
                        <Sparkles size={15} /> {product.featured ? 'Quitar destaque' : 'Destacar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() =>
                          void toggle(
                            product.id,
                            { archived: !product.archived, active: product.archived ? true : product.active },
                            product.archived ? 'Seguro restaurado.' : 'Seguro archivado.',
                          )
                        }
                      >
                        {product.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                        {product.archived ? 'Restaurar' : 'Archivar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--soft-danger btn--sm"
                        onClick={() => void remove(product.id, product.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
                {policyCount > 0 && (
                  <p className="tiny" style={{ marginTop: '0.65rem' }}>
                    <Layers size={12} style={{ verticalAlign: '-1px' }} /> Los cambios de precio no modifican las pólizas
                    ya contratadas: cada contrato conserva su snapshot.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
