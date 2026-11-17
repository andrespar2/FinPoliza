import { useMemo, useState } from 'react'
import { CircleAlert, LoaderCircle, Megaphone, Send, Trash2 } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { publishAnnouncement, clearNotification } from '../../services/notifications'
import { formatDateTime } from '../../lib/format'
import { AdminHeader, NoPermission } from '../../components/admin/AdminUI'
import { EmptyState } from '../../components/ui/common'
import { Field, TextInput } from '../../components/ui/forms'
import { useConfirm, useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'
import { Link } from 'react-router-dom'

export function AdminAnnouncements() {
  const state = useAppState()
  const toast = useToast()
  const confirm = useConfirm()
  const session = state.session!
  const [title, setTitle] = useState('')
  const [body, setBody] = useState(state.settings.notifications.templates.announcement)
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const announcements = useMemo(
    () =>
      state.notifications
        .filter((n) => n.userId === 'all' && n.type === 'announcement')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [state.notifications],
  )

  if (!hasPermission(session, 'notifications.manage')) {
    return (
      <>
        <AdminHeader title="Avisos" />
        <NoPermission permission="notifications.manage" />
      </>
    )
  }

  const publish = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSending(true)
    try {
      await publishAnnouncement(title, body, link.trim() || undefined)
      toast.success('Aviso publicado para todos los usuarios.')
      setTitle('')
      setBody(state.settings.notifications.templates.announcement)
      setLink('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el aviso.')
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Eliminar aviso',
      message: `¿Deseas eliminar el aviso "${name}"? Dejará de mostrarse en las notificaciones de los usuarios.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await clearNotification(id)
      toast.success('Aviso eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el aviso.')
    }
  }

  return (
    <>
      <AdminHeader
        title="Avisos y notificaciones"
        subtitle="Publica mensajes para todos los usuarios y revisa los avisos vigentes."
      />

      <div className="grid grid--auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))' }}>
        <form className="card stack" onSubmit={publish}>
          <div className="row" style={{ gap: '0.6rem' }}>
            <div className="card-head__icon">
              <Megaphone size={19} />
            </div>
            <div>
              <h2 className="card-title">Nuevo aviso</h2>
              <p className="tiny">Se envía a todos los usuarios como notificación interna.</p>
            </div>
          </div>
          {error && (
            <div className="form-error" role="alert">
              <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
            </div>
          )}
          <TextInput label="Título" value={title} onChange={setTitle} placeholder="Ej. Nuevo seguro disponible" />
          <Field label="Mensaje">
            <textarea
              className="textarea"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe el contenido del aviso"
            />
          </Field>
          <TextInput
            label="Enlace interno (opcional)"
            value={link}
            onChange={setLink}
            placeholder="/catalogo, /fondo, /seguros…"
            hint="Ruta dentro de la aplicación a la que irá el usuario."
          />
          <button type="submit" className="btn btn--primary" disabled={sending}>
            {sending ? (
              <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} />
            ) : (
              <Send size={18} />
            )}
            Publicar aviso
          </button>
        </form>

        <div className="card stack" style={{ alignSelf: 'start' }}>
          <h2 className="card-title">Plantillas automáticas</h2>
          <div className="stack stack--sm">
            {Object.entries(state.settings.notifications.templates).map(([key, value]) => (
              <div key={key}>
                <span className="tag">{key}</span>
                <p className="small muted" style={{ marginTop: '0.15rem' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
          <Link to="/admin/configuracion" className="btn btn--secondary btn--sm">
            Editar plantillas
          </Link>
          <p className="tiny">
            Los recordatorios de cuotas se generan automáticamente según los días configurados ({state.settings.insurance.reminderDays} días antes
            del vencimiento).
          </p>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Avisos publicados</h2>
          <span className="tiny">{announcements.length} avisos</span>
        </div>
        {announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={26} />}
            title="No hay avisos publicados"
            text="Publica un aviso para informar a tus usuarios sobre novedades o recordatorios."
          />
        ) : (
          <div className="list">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className="list-row__icon list-row__icon--blue">
                  <Megaphone size={18} />
                </span>
                <span className="list-row__body">
                  <span className="list-row__title">{announcement.title}</span>
                  <span className="list-row__sub">{announcement.body}</span>
                  <span className="list-row__sub">
                    {formatDateTime(announcement.createdAt)}
                    {announcement.link ? ` · ${announcement.link}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Eliminar aviso"
                  onClick={() => void remove(announcement.id, announcement.title)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
