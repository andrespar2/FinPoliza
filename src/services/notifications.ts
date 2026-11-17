import type { AppNotification, NotificationType } from '../types'
import { getMeta, setMeta } from '../lib/db'
import { daysFromToday, nowISO, todayISO } from '../lib/dates'
import { uid } from '../lib/id'
import { commit, requirePermission, store } from './store'
import { effectiveInstallmentStatus, isNotificationRead } from './selectors'

export { isNotificationRead }

export interface NotificationInput {
  type: NotificationType
  title: string
  body: string
  link?: string
  critical?: boolean
}

export function makeNotification(userId: string, input: NotificationInput): AppNotification {
  return {
    id: uid('ntf'),
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    createdAt: nowISO(),
    read: false,
    link: input.link,
    critical: input.critical,
  }
}

export async function addNotification(userId: string, input: NotificationInput): Promise<void> {
  const notification = makeNotification(userId, input)
  await commit(['notifications'], async (tx) => {
    await tx.put('notifications', notification)
  })
  await store.refresh()
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  const state = store.getState()
  const notification = state.notifications.find((n) => n.id === id)
  if (!notification) return
  if (notification.userId !== 'all' && notification.userId !== userId) {
    throw new Error('No puedes modificar notificaciones de otro usuario.')
  }
  const updated: AppNotification =
    notification.userId === 'all'
      ? { ...notification, readBy: [...new Set([...(notification.readBy ?? []), userId])] }
      : { ...notification, read: true }
  await commit(['notifications'], async (tx) => {
    await tx.put('notifications', updated)
  })
  await store.refresh()
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const state = store.getState()
  const pending = state.notifications.filter((n) => {
    if (n.userId === userId) return !n.read
    if (n.userId === 'all') return !(n.readBy ?? []).includes(userId)
    return false
  })
  if (pending.length === 0) return
  await commit(['notifications'], async (tx) => {
    for (const n of pending) {
      const updated =
        n.userId === 'all'
          ? { ...n, readBy: [...new Set([...(n.readBy ?? []), userId])] }
          : { ...n, read: true }
      await tx.put('notifications', updated)
    }
  })
  await store.refresh()
}

export async function clearNotification(id: string): Promise<void> {
  const state = store.getState()
  requirePermission(state, 'notifications.manage')
  await commit(['notifications'], async (tx) => {
    await tx.remove('notifications', id)
  })
  await store.refresh()
}

/** Publica un aviso global para todos los usuarios (panel administrativo). */
export async function publishAnnouncement(title: string, body: string, link?: string): Promise<void> {
  const session = store.getState().session
  if (!session) throw new Error('Debes iniciar sesión.')
  if (!(session.roleLevel === 'owner' || session.permissions.includes('notifications.manage'))) {
    throw new Error('No tienes permisos para publicar avisos.')
  }
  if (!title.trim()) throw new Error('El título del aviso es obligatorio.')
  if (!body.trim()) throw new Error('El mensaje del aviso es obligatorio.')
  const notification: AppNotification = {
    id: uid('ntf'),
    userId: 'all',
    type: 'announcement',
    title: title.trim(),
    body: body.trim(),
    createdAt: nowISO(),
    read: false,
    link,
    critical: true,
  }
  await commit(['notifications', 'audit'], async (tx) => {
    await tx.put('notifications', notification)
    await tx.put('audit', {
      id: uid('aud'),
      actorId: session.id,
      actorName: `${session.firstName} ${session.lastName}`,
      action: 'notification.publish',
      entity: 'Notificación',
      entityId: notification.id,
      description: `Aviso publicado: ${notification.title}`,
      after: { title: notification.title, body: notification.body },
      createdAt: nowISO(),
    })
  })
  await store.refresh()
}

export async function deleteNotification(id: string): Promise<void> {
  await clearNotification(id)
}

/**
 * Genera recordatorios de cuotas próximas a vencer y vencidas.
 * Se ejecuta una sola vez por cuota (clave en meta) para no duplicar avisos.
 */
export async function syncReminders(): Promise<void> {
  const state = store.getState()
  if (!state.settings.notifications.enabled) return
  const reminderDays = state.settings.insurance.reminderDays
  const seen = (await getMeta<string[]>('reminderKeys')) ?? []
  const seenSet = new Set(seen)
  const today = todayISO()
  const pending = state.installments.filter((i) => i.status === 'pending')
  const toCreate: AppNotification[] = []

  for (const inst of pending) {
    const effective = effectiveInstallmentStatus(inst, reminderDays)
    const shouldNotify = effective === 'overdue' || effective === 'due-soon'
    if (!shouldNotify) continue
    const key = `${inst.id}:${effective}:${today}`
    if (seenSet.has(key)) continue
    const policy = state.policies.find((p) => p.id === inst.policyId)
    if (!policy) continue
    const isOverdue = effective === 'overdue'
    const days = daysFromToday(inst.dueDate)
    toCreate.push({
      id: uid('ntf'),
      userId: inst.userId,
      type: isOverdue ? 'payment_overdue' : 'payment_due',
      title: isOverdue ? 'Tienes una cuota vencida' : 'Tu cuota está próxima a vencer',
      body: isOverdue
        ? `La cuota ${inst.number} de ${policy.snapshot.name} venció hace ${Math.abs(days)} días. Puedes pagarla desde Mis seguros.`
        : `La cuota ${inst.number} de ${policy.snapshot.name} vence en ${days} ${days === 1 ? 'día' : 'días'}.`,
      createdAt: nowISO(),
      read: false,
      link: `/seguros/${policy.id}`,
      critical: isOverdue,
    })
    seenSet.add(key)
    if (toCreate.length >= 25) break
  }

  if (toCreate.length > 0) {
    await commit(['notifications'], async (tx) => {
      for (const n of toCreate) await tx.put('notifications', n)
    })
    await setMeta('reminderKeys', [...seenSet])
    await store.refresh()
  }
}
