import { useMemo, useState } from 'react'
import { FileDiff, Search, ScrollText } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { auditLogs, auditActionLabel } from '../../services/selectors'
import { formatDateTime } from '../../lib/format'
import { AdminHeader, FilterChips, NoPermission } from '../../components/admin/AdminUI'
import { EmptyState } from '../../components/ui/common'
import { Sheet } from '../../components/ui/Sheet'
import { hasPermission } from '../../services/store'
import type { AuditLog } from '../../types'

type Filter = 'all' | 'users' | 'insurances' | 'payments' | 'fund' | 'settings'

export function AdminAudit() {
  const state = useAppState()
  const session = state.session!
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [detail, setDetail] = useState<AuditLog | null>(null)

  const logs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return auditLogs(state)
      .filter((log) => {
        if (filter === 'users') return log.action.startsWith('user.')
        if (filter === 'insurances') return log.action.startsWith('insurance.') || log.action === 'policy.cancel'
        if (filter === 'payments') return log.action.startsWith('payment.')
        if (filter === 'fund') return log.action.startsWith('fund.')
        if (filter === 'settings') return log.action === 'settings.update' || log.action.startsWith('role.')
        return true
      })
      .filter((log) => {
        if (!q) return true
        return [log.description, log.actorName, log.entity, auditActionLabel(log.action)]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [state, query, filter])

  if (!hasPermission(session, 'audit.view')) {
    return (
      <>
        <AdminHeader title="Auditoría" />
        <NoPermission permission="audit.view" />
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Auditoría administrativa"
        subtitle={`${state.audit.length} acciones registradas con trazabilidad completa.`}
      />

      <div className="admin-toolbar">
        <div className="search">
          <Search size={18} className="search__icon" />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por acción, usuario o entidad"
            aria-label="Buscar auditoría"
          />
        </div>
      </div>

      <div className="admin-tabs" style={{ marginBottom: '0.9rem' }}>
        <FilterChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'Todo', count: state.audit.length },
            { key: 'users', label: 'Usuarios' },
            { key: 'insurances', label: 'Seguros' },
            { key: 'payments', label: 'Pagos' },
            { key: 'fund', label: 'Fondo' },
            { key: 'settings', label: 'Configuración' },
          ]}
        />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={26} />}
          title="No hay registros"
          text="Las acciones administrativas aparecerán aquí con su fecha, responsable y valores modificados."
        />
      ) : (
        <div className="list">
          {logs.map((log) => (
            <button key={log.id} type="button" className="list-row" onClick={() => setDetail(log)}>
              <span className="audit-row__dot" style={{ marginTop: '1.1rem' }} />
              <span className="list-row__body">
                <span className="list-row__title">{auditActionLabel(log.action)}</span>
                <span className="list-row__sub">{log.description}</span>
                <span className="list-row__sub">
                  {log.actorName} · {formatDateTime(log.createdAt)}
                </span>
              </span>
              <FileDiff size={18} className="chev" />
            </button>
          ))}
        </div>
      )}

      <p className="tiny" style={{ marginTop: '0.8rem' }}>
        Solo se muestran las últimas 500 acciones. La auditoría no puede editarse ni eliminarse desde la interfaz.
      </p>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title="Detalle de auditoría">
        {detail && (
          <div className="stack">
            <div className="card card--flat">
              <div className="summary-row">
                <span className="summary-row__label">Acción</span>
                <span className="summary-row__value">{auditActionLabel(detail.action)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Responsable</span>
                <span className="summary-row__value">{detail.actorName}</span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Entidad</span>
                <span className="summary-row__value">
                  {detail.entity} · {detail.entityId.slice(-8)}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-row__label">Fecha</span>
                <span className="summary-row__value">{formatDateTime(detail.createdAt)}</span>
              </div>
            </div>
            <div className="card card--flat">
              <div className="tiny">Descripción</div>
              <p className="small" style={{ marginTop: '0.25rem', lineHeight: 1.5 }}>
                {detail.description}
              </p>
            </div>
            {detail.before && Object.keys(detail.before).length > 0 && (
              <div className="card card--flat">
                <div className="tiny">Valores anteriores</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.35rem' }}>
                  {JSON.stringify(detail.before, null, 2)}
                </pre>
              </div>
            )}
            {detail.after && Object.keys(detail.after).length > 0 && (
              <div className="card card--flat">
                <div className="tiny">Valores nuevos</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#a6f5dc', marginTop: '0.35rem' }}>
                  {JSON.stringify(detail.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}

