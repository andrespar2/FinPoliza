import type { SessionUser, User } from '../types'
import { checkPasswordStrength, hashPassword, verifyPassword } from '../lib/crypto'
import { nowISO } from '../lib/dates'
import { uid } from '../lib/id'
import { commit, store } from './store'
import { addNotification } from './notifications'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Escribe tu correo electrónico.'
  if (!EMAIL_RE.test(email.trim())) return 'El correo no tiene un formato válido.'
  return null
}

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return 'Escribe tu número de teléfono.'
  if (digits.length < 7) return 'El teléfono debe tener al menos 7 dígitos.'
  return null
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const state = store.getState()
  const normalized = email.trim().toLowerCase()
  const user = state.users.find((u) => u.email.toLowerCase() === normalized)
  if (!user) {
    throw new Error('No encontramos una cuenta con este correo. Verifica e intenta de nuevo.')
  }
  if (user.status === 'suspended') {
    throw new Error('Tu cuenta está suspendida. Comunícate con FinPoliza para reactivarla.')
  }
  if (user.status === 'inactive') {
    throw new Error('Tu cuenta está inactiva. Comunícate con FinPoliza para más información.')
  }
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    throw new Error('La contraseña no es correcta. Revisa tus datos e intenta de nuevo.')
  }
  const updated: User = { ...user, lastLoginAt: nowISO(), updatedAt: nowISO() }
  await commit(['users'], async (tx) => {
    await tx.put('users', updated)
  })
  await store.refresh()
  store.setSessionFor(updated)
  const session = store.getState().session
  if (!session) throw new Error('No se pudo iniciar la sesión.')
  return session
}

export interface RegisterInput {
  firstName: string
  lastName: string
  docType: User['docType']
  docNumber: string
  email: string
  phone: string
  password: string
  birthDate?: string
  city?: string
  address?: string
}

export async function signUp(input: RegisterInput): Promise<SessionUser> {
  const state = store.getState()
  if (!state.settings.features.registrationEnabled) {
    throw new Error('El registro de nuevos usuarios está deshabilitado en esta demo.')
  }
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const docNumber = input.docNumber.trim()
  if (firstName.length < 2) throw new Error('Escribe tu nombre completo.')
  if (lastName.length < 2) throw new Error('Escribe tus apellidos.')
  if (!docNumber || docNumber.length < 5) throw new Error('Escribe un número de documento válido.')
  const emailError = validateEmail(input.email)
  if (emailError) throw new Error(emailError)
  const phoneError = validatePhone(input.phone)
  if (phoneError) throw new Error(phoneError)
  const strength = checkPasswordStrength(input.password)
  if (!strength.valid) throw new Error(`La contraseña no es segura. ${strength.problems.join(' ')}`)
  if (state.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
    throw new Error('Ya existe una cuenta con este correo electrónico.')
  }
  if (state.users.some((u) => u.docNumber === docNumber)) {
    throw new Error('Ya existe una cuenta con este documento de identidad.')
  }
  const role = state.roles.find((r) => r.level === 'user')
  if (!role) throw new Error('No se encontró el rol de usuario.')
  const now = nowISO()
  const user: User = {
    id: uid('usr'),
    firstName,
    lastName,
    docType: input.docType,
    docNumber,
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address?.trim() ?? '',
    city: input.city?.trim() ?? '',
    birthDate: input.birthDate || '1990-01-01',
    roleId: role.id,
    status: 'active',
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  }
  await commit(['users', 'notifications', 'audit'], async (tx) => {
    await tx.put('users', user)
    const notification = {
      id: uid('ntf'),
      userId: user.id,
      type: 'welcome' as const,
      title: `¡Bienvenido a FinPoliza, ${firstName}!`,
      body: state.settings.notifications.templates.welcome,
      createdAt: now,
      read: false,
    }
    await tx.put('notifications', notification)
    await tx.put('audit', {
      id: uid('aud'),
      actorId: user.id,
      actorName: `${firstName} ${lastName}`,
      action: 'user.create' as const,
      entity: 'Usuario',
      entityId: user.id,
      description: 'Registro de nuevo usuario desde la aplicación móvil.',
      createdAt: now,
    })
  })
  await store.refresh()
  store.setSessionFor(user)
  const session = store.getState().session
  if (!session) throw new Error('No se pudo iniciar la sesión.')
  return session
}

export async function signOut(): Promise<void> {
  store.clearSession()
}

export interface ProfileUpdate {
  phone: string
  email: string
  address: string
  city: string
}

export async function updateOwnProfile(userId: string, patch: ProfileUpdate): Promise<User> {
  const state = store.getState()
  const user = state.users.find((u) => u.id === userId)
  if (!user) throw new Error('No encontramos tu cuenta.')
  const emailError = validateEmail(patch.email)
  if (emailError) throw new Error(emailError)
  const phoneError = validatePhone(patch.phone)
  if (phoneError) throw new Error(phoneError)
  if (
    state.users.some(
      (u) => u.id !== userId && u.email.toLowerCase() === patch.email.trim().toLowerCase(),
    )
  ) {
    throw new Error('Este correo ya está registrado por otra cuenta.')
  }
  const updated: User = {
    ...user,
    email: patch.email.trim().toLowerCase(),
    phone: patch.phone.trim(),
    address: patch.address.trim(),
    city: patch.city.trim(),
    updatedAt: nowISO(),
  }
  await commit(['users'], async (tx) => {
    await tx.put('users', updated)
  })
  await store.refresh()
  store.syncSession()
  return updated
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const state = store.getState()
  const user = state.users.find((u) => u.id === userId)
  if (!user) throw new Error('No encontramos tu cuenta.')
  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) throw new Error('La contraseña actual no es correcta.')
  const strength = checkPasswordStrength(newPassword)
  if (!strength.valid) throw new Error(`La nueva contraseña no es segura. ${strength.problems.join(' ')}`)
  if (currentPassword === newPassword) throw new Error('La nueva contraseña debe ser diferente a la actual.')
  const updated: User = { ...user, passwordHash: await hashPassword(newPassword), updatedAt: nowISO() }
  await commit(['users'], async (tx) => {
    await tx.put('users', updated)
  })
  await store.refresh()
}

export async function resetPasswordDemo(
  email: string,
  docNumber: string,
  newPassword: string,
): Promise<void> {
  const state = store.getState()
  const user = state.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.docNumber === docNumber.trim(),
  )
  if (!user) {
    throw new Error('Los datos no coinciden con ninguna cuenta. Verifica el correo y el documento.')
  }
  const strength = checkPasswordStrength(newPassword)
  if (!strength.valid) throw new Error(`La contraseña no es segura. ${strength.problems.join(' ')}`)
  const updated: User = {
    ...user,
    passwordHash: await hashPassword(newPassword),
    updatedAt: nowISO(),
    mustChangePassword: false,
  }
  await commit(['users'], async (tx) => {
    await tx.put('users', updated)
  })
  await addNotification(user.id, {
    type: 'account',
    title: 'Contraseña actualizada',
    body: 'Tu contraseña fue restablecida correctamente. Si no fuiste tú, comunícate con FinPoliza.',
  })
  await store.refresh()
}
