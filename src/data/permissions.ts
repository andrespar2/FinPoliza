import type { Permission, Role, RoleLevel } from '../types'

export interface PermissionDef {
  key: Permission
  label: string
  description: string
  group: string
}

export const PERMISSIONS: PermissionDef[] = [
  {
    key: 'dashboard.view',
    label: 'Ver dashboard',
    description: 'Acceso al resumen financiero y estadísticas del panel.',
    group: 'General',
  },
  {
    key: 'users.view',
    label: 'Ver usuarios',
    description: 'Consultar fichas, seguros y movimientos de los usuarios.',
    group: 'Usuarios',
  },
  {
    key: 'users.manage',
    label: 'Gestionar usuarios',
    description: 'Crear, editar, suspender y restablecer contraseñas.',
    group: 'Usuarios',
  },
  {
    key: 'insurances.view',
    label: 'Ver seguros',
    description: 'Consultar el catálogo administrativo de seguros.',
    group: 'Seguros',
  },
  {
    key: 'insurances.manage',
    label: 'Gestionar seguros',
    description: 'Crear, editar, activar y archivar seguros y precios.',
    group: 'Seguros',
  },
  {
    key: 'payments.view',
    label: 'Ver pagos',
    description: 'Consultar pagos, cuotas pendientes y vencidas.',
    group: 'Pagos',
  },
  {
    key: 'payments.manage',
    label: 'Gestionar pagos',
    description: 'Registrar pagos manuales y cambiar estados de pago.',
    group: 'Pagos',
  },
  {
    key: 'fund.view',
    label: 'Ver fondo solidario',
    description: 'Consultar aportaciones, retiros y saldos del fondo.',
    group: 'Fondo solidario',
  },
  {
    key: 'fund.manage',
    label: 'Gestionar fondo solidario',
    description: 'Registrar ajustes con justificación y configurar el fondo.',
    group: 'Fondo solidario',
  },
  {
    key: 'settings.manage',
    label: 'Configuración global',
    description: 'Editar textos, contactos, moneda y funcionalidades.',
    group: 'Configuración',
  },
  {
    key: 'roles.manage',
    label: 'Roles y permisos',
    description: 'Crear roles y modificar permisos de acceso.',
    group: 'Configuración',
  },
  {
    key: 'audit.view',
    label: 'Auditoría',
    description: 'Consultar el historial de acciones administrativas.',
    group: 'Auditoría',
  },
  {
    key: 'notifications.manage',
    label: 'Notificaciones',
    description: 'Publicar avisos y configurar mensajes del sistema.',
    group: 'Notificaciones',
  },
]

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.key)

export const ROLE_PRESETS: Record<RoleLevel, { name: string; description: string; permissions: Permission[] }> = {
  owner: {
    name: 'Administrador principal',
    description: 'Control total de la aplicación. No se puede restringir.',
    permissions: ALL_PERMISSIONS,
  },
  admin: {
    name: 'Administrador',
    description: 'Gestión operativa y financiera completa, sin administrar roles.',
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'roles.manage'),
  },
  staff: {
    name: 'Personal administrativo',
    description: 'Consulta y registro de pagos. Sin acceso a configuración.',
    permissions: [
      'dashboard.view',
      'users.view',
      'insurances.view',
      'payments.view',
      'payments.manage',
      'fund.view',
      'notifications.manage',
    ],
  },
  user: {
    name: 'Usuario',
    description: 'Cliente de la compañía. Solo accede a su propia información.',
    permissions: [],
  },
}

export const ROLE_COLORS: Record<RoleLevel, string> = {
  owner: '#F2C230',
  admin: '#4F8BFF',
  staff: '#34D399',
  user: '#94A3B8',
}

export function createSystemRoles(now: string): Role[] {
  return (Object.keys(ROLE_PRESETS) as RoleLevel[]).map((level) => ({
    id: `role_${level}`,
    name: ROLE_PRESETS[level].name,
    description: ROLE_PRESETS[level].description,
    level,
    permissions: [...ROLE_PRESETS[level].permissions],
    system: true,
    createdAt: now,
  }))
}

export function permissionLabel(key: Permission): string {
  return PERMISSIONS.find((p) => p.key === key)?.label ?? key
}
