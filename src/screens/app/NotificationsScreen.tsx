import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  HandHeart,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { notificationsForUser, isNotificationRead } from '../../services/selectors'
import { markAllNotificationsRead, markNotificationRead } from '../../services/notifications'
import { formatDateTime } from '../../lib/format'
import { EmptyState, ScreenHeader } from '../../components/ui/common'
import { useToast } from '../../components/ui/Feedback'
import type { NotificationType } from '../../types'

const ICONS: Record<NotificationType, typeof Bell> = {
  payment_due: BellRing,
  payment_overdue: AlertTriangle,
  payment_received: ReceiptText,
  fund_deposit: HandHeart,
  fund_withdrawal: Wallet,
  announcement: Megaphone,
  welcome: ShieldCheck,
  account: ShieldCheck,
}

export function NotificationsScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const session = state.session!
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const notifications = useMemo(() => notificationsForUser(state, session.id), [state, session.id])
  const unread = notifications.filter((n) => !isNotificationRead(n, session.id))

  const filtered = filter === 'unread' ? unread : notifications

  const openNotification = async (id: string, link?: string) => {
    await markNotificationRead(id, session.id)
    if (link) navigate(link)
  }

  return (
    <div className="page">
      <ScreenHeader
        back="/inicio"
        title="Notificaciones"
        subtitle={unread.length > 0 ? `${unread.length} sin leer` : 'Estás al día'}
        actions={
          unread.length > 0 ? (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={async () => {
                await markAllNotificationsRead(session.id)
                toast.success('Todas las notificaciones fueron marcadas como leídas.')
              }}
            >
              <CheckCheck size={16} /> Leídas
            </button>
          ) : undefined
        }
      />

      <div className="segmented" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`segmented__item ${filter === 'all' ? 'segmented__item--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas · {notifications.length}
        </button>
        <button
          type="button"
          className={`segmented__item ${filter === 'unread' ? 'segmented__item--active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Sin leer · {unread.length}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={26} />}
          title={filter === 'unread' ? 'No tienes notificaciones sin leer' : 'Aún no hay notificaciones'}
          text="Aquí verás los recordatorios de pago, los movimientos de tu fondo y los avisos de FinPoliza."
        />
      ) : (
        <div className="list">
          {filtered.map((notification) => {
            const read = isNotificationRead(notification, session.id)
            const Icon = ICONS[notification.type] ?? Bell
            return (
              <button
                key={notification.id}
                type="button"
                className={`notification-item ${read ? '' : 'notification-item--unread'}`}
                onClick={() => void openNotification(notification.id, notification.link)}
              >
                <span
                  className={`movement-icon ${
                    notification.type === 'payment_overdue'
                      ? 'movement-icon--out'
                      : notification.type === 'fund_deposit' || notification.type === 'payment_received'
                        ? 'movement-icon--in'
                        : 'movement-icon--neutral'
                  }`}
                  aria-hidden="true"
                >
                  <Icon size={19} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="notification-item__title">{notification.title}</span>
                  <span className="notification-item__body" style={{ display: 'block' }}>
                    {notification.body}
                  </span>
                  <span className="notification-item__time" style={{ display: 'block' }}>
                    {formatDateTime(notification.createdAt)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <p className="tiny center" style={{ marginTop: '1rem' }}>
        Las notificaciones se generan dentro de la DEMO. No se envían mensajes push ni correos reales.
      </p>
    </div>
  )
}
