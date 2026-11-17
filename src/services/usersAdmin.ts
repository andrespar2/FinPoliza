import type { User, UserStatus } from '../types'
import { hashPassword, checkPasswordStrength } from '../lib/crypto'
import { nowISO } from '../lib/dates'
import { uid } from '../lib/id'
import { commit, requirePermission, store } from './store'
import { makeAudit } from './audit'
import { validateEmail, validatePhone } from './auth'

export interface AdminUserInput {
  firstName: string
  lastName: string
  docType: User['docType']
  docNumber: string
  email: string
  phone: string
  address: string
  city: string
  birthDate: string
  roleId: string
  status: UserStatus
  password?: string
  notes?: string
}

export async function createUser(input: AdminUserInput): Promise<User> {
  const state = store.getState()
  const actor = requirePermission(state, 'users.manage')
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (firstName.length < 2) throw new Error('El nombre es obligatorio.')
  if (lastName.length < 2) throw new Error('Los apellidos son obligatorios.')
  const emailError = validateEmail(input.email)
  if (emailError) throw new Error(emailError)
  const phoneError = validatePhone(input.phone)
  if (phoneError) throw new Error(phoneError)
  if (!input.docNumber.trim()) throw new Error('El documento de identidad es obligatorio.')
  if (state.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
    throw new Error('Ya existe un usuario con este correo.')
  }
  if (state.users.some((u) => u.docNumber === input.docNumber.trim())) {
    throw new Error('Ya existe un usuario con este documento.')
  }
  const role = state.roles.find((r) => r.id === input.roleId)
  if (!role) throw new Error('El rol seleccionado no existe.')
  if (actor.roleLevel !== 'owner' && role.level === 'owner') {
    throw new Error('Solo el administrador principal puede crear otro administrador principal.')
  }
  const password = input.password?.trim() || 'FinPoliza2026*'
  const strength = checkPasswordStrength(password)
  if (!strength.valid) throw new Error(`La contraseña no es segura. ${strength.problems.join(' ')}`)
  const now = nowISO()
  const user: User = {
    id: uid('usr'),
    firstName,
    lastName,
    docType: input.docType,
    docNumber: input.docNumber.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    birthDate: input.birthDate || '1990-01-01',
    roleId: input.roleId,
    status: input.status,
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
    notes: input.notes?.trim(),
  }
  const audit = makeAudit(
    actor,
    'user.create',
    'Usuario',
    user.id,
    `Creó el usuario ${firstName} ${lastName} (${user.email}).`,
    undefined,
    { email: user.email, role: role.name, status: user.status },
  )
  await commit(['users', 'audit'], async (tx) => {
    await tx.put('users', user)
    await tx.put('audit', audit)
  })
  await store.refresh()
  return user
}

export async function updateUser(id: string, input: AdminUserInput): Promise<User> {
  const state = store.getState()
  const actor = requirePermission(state, 'users.manage')
  const current = state.users.find((u) => u.id === id)
  if (!current) throw new Error('El usuario no existe.')
  const role = state.roles.find((r) => r.id === input.roleId)
  if (!role) throw new Error('El rol seleccionado no existe.')
  if (current.roleId === 'role_owner' && actor.roleLevel !== 'owner') {
    throw new Error('Solo el administrador principal puede modificar su propia cuenta.')
  }
  if (input.email.toLowerCase() !== current.email.toLowerCase()) {
    const emailError = validateEmail(input.email)
    if (emailError) throw new Error(emailError)
    if (state.users.some((u) => u.id !== id && u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error('Ya existe otro usuario con este correo.')
    }
  }
  if (state.users.some((u) => u.id !== id && u.docNumber === input.docNumber.trim())) {
    throw new Error('Ya existe otro usuario con este documento.')
  }
  const updated: User = {
    ...current,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    docType: input.docType,
    docNumber: input.docNumber.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    birthDate: input.birthDate,
    roleId: input.roleId,
    status: input.status,
    notes: input.notes?.trim(),
    updatedAt: nowISO(),
  }
  const audit = makeAudit(
    actor,
    'user.update',
    'Usuario',
    id,
    `Actualizó los datos de ${updated.firstName} ${updated.lastName}.`,
    {
      email: current.email,
      phone: current.phone,
      roleId: current.roleId,
      status: current.status,
      address: current.address,
    },
    {
      email: updated.email,
      phone: updated.phone,
      roleId: updated.roleId,
      status: updated.status,
      address: updated.address,
    },
  )
  await commit(['users', 'audit'], async (tx) => {
    await tx.put('users', updated)
    await tx.put('audit', audit)
  })
  await store.refresh()
  store.syncSession()
  return updated
}

export async function setUserStatus(id: string, status: UserStatus): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'users.manage')
  const user = state.users.find((u) => u.id === id)
  if (!user) throw new Error('El usuario no existe.')
  if (user.id === actor.id && status !== 'active') {
    throw new Error('No puedes suspender tu propia cuenta.')
  }
  if (user.roleId === 'role_owner' && actor.roleLevel !== 'owner') {
    throw new Error('Solo el administrador principal puede cambiar el estado de su cuenta.')
  }
  const updated: User = { ...user, status, updatedAt: nowISO() }
  const audit = makeAudit(
    actor,
    'user.status',
    'Usuario',
    id,
    `Cambió el estado de ${user.firstName} ${user.lastName} a ${statusLabel(status)}.`,
    { status: user.status },
    { status },
  )
  await commit(['users', 'audit'], async (tx) => {
    await tx.put('users', updated)
    await tx.put('audit', audit)
  })
  await store.refresh()
  store.syncSession()
}

export function statusLabel(status: UserStatus): string {
  if (status === 'active') return 'Activo'
  if (status === 'suspended') return 'Suspendido'
  return 'Inactivo'
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'users.manage')
  const user = state.users.find((u) => u.id === id)
  if (!user) throw new Error('El usuario no existe.')
  const strength = checkPasswordStrength(newPassword)
  if (!strength.valid) throw new Error(`La contraseña no es segura. ${strength.problems.join(' ')}`)
  const updated: User = {
    ...user,
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: true,
    updatedAt: nowISO(),
  }
  const audit = makeAudit(
    actor,
    'user.password',
    'Usuario',
    id,
    `Restableció la contraseña de ${user.firstName} ${user.lastName}.`,
    undefined,
    { mustChangePassword: true },
  )
  await commit(['users', 'audit', 'notifications'], async (tx) => {
    await tx.put('users', updated)
    await tx.put('audit', audit)
    await tx.put('notifications', {
      id: uid('ntf'),
      userId: id,
      type: 'account' as const,
      title: 'Tu contraseña fue restablecida',
      body: 'Un asesor de FinPoliza restableció tu contraseña. Te recomendamos cambiarla al ingresar.',
      createdAt: nowISO(),
      read: false,
    })
  })
  await store.refresh()
}

/** Solo se permite eliminar usuarios sin historial financiero (se preserva la contabilidad). */
export async function deleteUser(id: string): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'users.manage')
  const user = state.users.find((u) => u.id === id)
  if (!user) throw new Error('El usuario no existe.')
  if (user.roleId === 'role_owner') throw new Error('No se puede eliminar al administrador principal.')
  if (user.id === actor.id) throw new Error('No puedes eliminar tu propia cuenta.')
  const hasPolicies = state.policies.some((p) => p.userId === id)
  const hasPayments = state.payments.some((p) => p.userId === id)
  const hasFund = state.fundMovements.some((m) => m.userId === id)
  if (hasPolicies || hasPayments || hasFund) {
    throw new Error(
      'Este usuario tiene historial financiero y no se puede eliminar. Suspende la cuenta para conservar la trazabilidad contable.',
    )
  }
  const audit = makeAudit(
    actor,
    'user.delete',
    'Usuario',
    id,
    `Eliminó al usuario ${user.firstName} ${user.lastName}.`,
    { email: user.email, docNumber: user.docNumber },
  )
  await commit(['users', 'notifications', 'audit'], async (tx) => {
    await tx.remove('users', id)
    const notifications = await tx.getAll<{ id: string; userId: string }>('notifications')
    for (const n of notifications.filter((x) => x.userId === id)) {
      await tx.remove('notifications', n.id)
    }
    await tx.put('audit', audit)
  })
  await store.refresh()
}

export async function changeUserRole(id: string, roleId: string): Promise<void> {
  const state = store.getState()
  const actor = requirePermission(state, 'users.manage')
  const user = state.users.find((u) => u.id === id)
  const role = state.roles.find((r) => r.id === roleId)
  if (!user || !role) throw new Error('Usuario o rol no encontrado.')
  if (actor.roleLevel !== 'owner' && (role.level === 'owner' || role.level === 'admin')) {
    throw new Error('Solo el administrador principal puede asignar roles administrativos.')
  }
  if (user.roleId === 'role_owner' && actor.roleLevel !== 'owner') {
    throw new Error('Solo el administrador principal puede modificar su rol.')
  }
  const audit = makeAudit(
    actor,
    'user.update',
    'Usuario',
    id,
    `Cambió el rol de ${user.firstName} ${user.lastName} a ${role.name}.`,
    { roleId: user.roleId },
    { roleId },
  )
  await commit(['users', 'audit'], async (tx) => {
    await tx.put('users', { ...user, roleId, updatedAt: nowISO() })
    await tx.put('audit', audit)
  })
  await store.refresh()
  store.syncSession()
}
