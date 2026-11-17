import type { AppSettings, Permission, Role } from '../types'
import { nowISO } from '../lib/dates'
import { uid } from '../lib/id'
import { commit, requirePermission, store } from './store'
import { diffObjects, makeAudit } from './audit'
import { ALL_PERMISSIONS } from '../data/permissions'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch)) return (patch === undefined ? base : (patch as T))
  if (!isPlainObject(base)) return patch as T
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      out[key] = deepMerge(base[key], value)
    } else {
      out[key] = value
    }
  }
  return out as T
}

export async function updateSettings(patch: Partial<AppSettings>, description: string): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'settings.manage')
  const next = deepMerge(state.settings, patch)
  if (!/^[A-Z]{3}$/.test(next.regional.currency)) {
    throw new Error('La moneda debe ser un código ISO de 3 letras (por ejemplo COP).')
  }
  try {
    new Intl.NumberFormat(next.regional.locale, { style: 'currency', currency: next.regional.currency })
  } catch {
    throw new Error('El formato regional o la moneda no son válidos.')
  }
  if (!['normal', 'large', 'xlarge'].includes(next.appearance.textScale)) {
    throw new Error('La preferencia de tamaño de texto no es válida.')
  }
  if (next.fund.minDeposit <= 0 || next.fund.minWithdrawal < 0) {
    throw new Error('Los montos mínimos del fondo deben ser positivos.')
  }
  if (next.fund.suggestedAmounts.some((a) => !Number.isFinite(a) || a <= 0)) {
    throw new Error('Las cantidades sugeridas deben ser valores positivos.')
  }
  const diff = diffObjects(
    state.settings as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>,
  )
  const audit = makeAudit(
    actor,
    description.toLowerCase().includes('fondo') ? 'fund.settings' : 'settings.update',
    'Configuración',
    'global',
    description,
    diff.before,
    diff.after,
  )
  await commit(['settings', 'audit'], async (tx) => {
    await tx.put('settings', { id: 'global', ...next, updatedAt: nowISO() })
    await tx.put('audit', audit)
  })
  await store.refresh()
}

export async function updateRole(
  roleId: string,
  patch: { name?: string; description?: string; permissions?: Permission[] },
): Promise<Role> {
  const state = store.getState()
  const actor = requirePermission(state, 'roles.manage')
  const role = state.roles.find((r) => r.id === roleId)
  if (!role) throw new Error('El rol no existe.')
  if (role.level === 'owner') throw new Error('El rol de administrador principal no se puede modificar.')
  if (patch.name !== undefined && patch.name.trim().length < 3) throw new Error('El nombre del rol es muy corto.')
  if (patch.permissions) {
    const invalid = patch.permissions.filter((p) => !ALL_PERMISSIONS.includes(p))
    if (invalid.length) throw new Error('Se recibieron permisos no válidos.')
  }
  if (actor.roleLevel !== 'owner' && role.level === 'admin') {
    throw new Error('Solo el administrador principal puede modificar el rol de administrador.')
  }
  const updated: Role = {
    ...role,
    name: patch.name?.trim() ?? role.name,
    description: patch.description?.trim() ?? role.description,
    permissions: patch.permissions ?? role.permissions,
  }
  const audit = makeAudit(
    actor,
    'role.update',
    'Rol',
    roleId,
    `Actualizó el rol ${updated.name}.`,
    { name: role.name, permissions: role.permissions },
    { name: updated.name, permissions: updated.permissions },
  )
  await commit(['roles', 'audit'], async (tx) => {
    await tx.put('roles', updated)
    await tx.put('audit', audit)
  })
  await store.refresh()
  store.syncSession()
  return updated
}

export async function createRole(name: string, description: string, permissions: Permission[]): Promise<Role> {
  const state = store.getState()
  const actor = requirePermission(state, 'roles.manage')
  if (name.trim().length < 3) throw new Error('El nombre del rol es obligatorio.')
  if (state.roles.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) {
    throw new Error('Ya existe un rol con ese nombre.')
  }
  const role: Role = {
    id: uid('role'),
    name: name.trim(),
    description: description.trim(),
    level: 'staff',
    permissions: permissions.filter((p) => ALL_PERMISSIONS.includes(p)),
    system: false,
    createdAt: nowISO(),
  }
  const audit = makeAudit(actor, 'role.update', 'Rol', role.id, `Creó el rol ${role.name}.`, undefined, {
    permissions: role.permissions,
  })
  await commit(['roles', 'audit'], async (tx) => {
    await tx.put('roles', role)
    await tx.put('audit', audit)
  })
  await store.refresh()
  store.syncSession()
  return role
}

export async function deleteRole(roleId: string): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'roles.manage')
  const role = state.roles.find((r) => r.id === roleId)
  if (!role) throw new Error('El rol no existe.')
  if (role.system) throw new Error('Los roles del sistema no se pueden eliminar.')
  if (state.users.some((u) => u.roleId === roleId)) {
    throw new Error('No puedes eliminar un rol que tiene usuarios asignados.')
  }
  const audit = makeAudit(actor, 'role.update', 'Rol', roleId, `Eliminó el rol ${role.name}.`)
  await commit(['roles', 'audit'], async (tx) => {
    await tx.remove('roles', roleId)
    await tx.put('audit', audit)
  })
  await store.refresh()
}
