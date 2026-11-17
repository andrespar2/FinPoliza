import type { AuditAction, AuditLog, SessionUser } from '../types'
import { nowISO } from '../lib/dates'
import { uid } from '../lib/id'

export function makeAudit(
  actor: Pick<SessionUser, 'id' | 'firstName' | 'lastName'>,
  action: AuditAction,
  entity: string,
  entityId: string,
  description: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): AuditLog {
  return {
    id: uid('aud'),
    actorId: actor.id,
    actorName: `${actor.firstName} ${actor.lastName}`,
    action,
    entity,
    entityId,
    description,
    before,
    after,
    createdAt: nowISO(),
  }
}

/** Diferencias simples para guardar en auditoría. */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const changedBefore: Record<string, unknown> = {}
  const changedAfter: Record<string, unknown> = {}
  for (const key of Object.keys(after)) {
    const a = JSON.stringify(before[key])
    const b = JSON.stringify(after[key])
    if (a !== b) {
      changedBefore[key] = before[key]
      changedAfter[key] = after[key]
    }
  }
  return { before: changedBefore, after: changedAfter }
}
