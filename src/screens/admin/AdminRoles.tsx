import { useMemo, useState } from 'react'
import { ChevronRight, CircleAlert, KeyRound, LoaderCircle, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { createRole, deleteRole, updateRole } from '../../services/settings'
import { PERMISSIONS, ROLE_COLORS } from '../../data/permissions'
import { AdminHeader, NoPermission } from '../../components/admin/AdminUI'
import { Sheet } from '../../components/ui/Sheet'
import { Field, SelectInput, TextInput } from '../../components/ui/forms'
import { useConfirm, useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'
import type { Permission, Role } from '../../types'

const GROUPS = Array.from(new Set(PERMISSIONS.map((p) => p.group)))

export function AdminRoles() {
  const state = useAppState()
  const toast = useToast()
  const confirm = useConfirm()
  const session = state.session!
  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const roles = useMemo(() => state.roles.slice().sort((a, b) => a.level.localeCompare(b.level)), [state.roles])

  if (!hasPermission(session, 'roles.manage')) {
    return (
      <>
        <AdminHeader title="Roles y permisos" />
        <NoPermission permission="roles.manage" />
      </>
    )
  }

  const openEdit = (role: Role) => {
    setEditing(role)
    setName(role.name)
    setDescription(role.description)
    setPermissions(role.permissions)
    setError(null)
  }

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
    setName('')
    setDescription('')
    setPermissions(['dashboard.view', 'users.view'])
    setError(null)
  }

  const close = () => {
    setEditing(null)
    setCreating(false)
    setError(null)
  }

  const togglePermission = (permission: Permission) => {
    setPermissions((list) =>
      list.includes(permission) ? list.filter((p) => p !== permission) : [...list, permission],
    )
  }

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      if (editing) {
        await updateRole(editing.id, { name, description, permissions })
        toast.success('Rol actualizado.')
      } else {
        await createRole(name, description, permissions)
        toast.success('Rol creado.')
      }
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el rol.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (role: Role) => {
    const ok = await confirm({
      title: 'Eliminar rol',
      message: `¿Deseas eliminar el rol "${role.name}"? Solo es posible si no tiene usuarios asignados.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteRole(role.id)
      toast.success('Rol eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el rol.')
    }
  }

  return (
    <>
      <AdminHeader
        title="Roles y permisos"
        subtitle="Define qué puede ver y hacer cada tipo de usuario."
        actions={
          <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
            <Plus size={16} /> Nuevo rol
          </button>
        }
      />

      <div className="banner" style={{ marginBottom: '1rem' }}>
        <ShieldCheck size={17} style={{ flexShrink: 0 }} />
        <span>
          Los permisos se validan en la lógica de la aplicación, no solo en los botones. El rol de administrador
          principal siempre conserva acceso total.
        </span>
      </div>

      <div className="stack">
        {roles.map((role) => {
          const userCount = state.users.filter((u) => u.roleId === role.id).length
          const locked = role.level === 'owner'
          return (
            <div key={role.id} className="card">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span
                  className="list-row__icon"
                  style={{ background: `${ROLE_COLORS[role.level]}18`, color: ROLE_COLORS[role.level] }}
                >
                  <KeyRound size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="strong">{role.name}</span>
                    {role.system && <span className="badge badge--neutral">Sistema</span>}
                    {locked && <span className="badge badge--gold">Protegido</span>}
                  </div>
                  <div className="tiny" style={{ marginTop: '0.15rem' }}>
                    {role.description}
                  </div>
                  <div className="row" style={{ gap: '0.8rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    <span className="tiny row" style={{ gap: '0.25rem' }}>
                      <Users size={13} /> {userCount} usuarios
                    </span>
                    <span className="tiny">
                      {role.level === 'owner' ? 'Todos los permisos' : `${role.permissions.length} permisos`}
                    </span>
                  </div>
                </div>
                <div className="row" style={{ gap: '0.3rem' }}>
                  {!locked && (
                    <>
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => openEdit(role)}>
                        Editar <ChevronRight size={14} />
                      </button>
                      {!role.system && (
                        <button type="button" className="icon-btn" aria-label="Eliminar rol" onClick={() => void remove(role)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Sheet
        open={!!editing || creating}
        onClose={close}
        title={editing ? `Editar rol: ${editing.name}` : 'Crear nuevo rol'}
        subtitle="Marca los permisos que tendrá este rol."
        footer={
          <>
            {error && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void save()} disabled={saving}>
              {saving ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <SaveIcon />}
              {editing ? 'Guardar cambios' : 'Crear rol'}
            </button>
          </>
        }
      >
        <div className="stack">
          <TextInput label="Nombre del rol" value={name} onChange={setName} />
          <Field label="Descripción">
            <textarea className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {!editing && (
            <SelectInput
              label="Nivel de acceso"
              value="staff"
              onChange={() => undefined}
              options={[{ value: 'staff', label: 'Personal administrativo (configurable)' }]}
              hint="Los roles personalizados no pueden ser administradores principales."
            />
          )}

          {GROUPS.map((group) => (
            <div key={group}>
              <p className="tag" style={{ marginBottom: '0.35rem' }}>
                {group}
              </p>
              <div className="stack stack--sm">
                {PERMISSIONS.filter((p) => p.group === group).map((permission) => (
                  <label key={permission.key} className="perm-item">
                    <input
                      type="checkbox"
                      checked={permissions.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                    />
                    <span>
                      <span className="strong" style={{ display: 'block', fontSize: '0.9rem' }}>
                        {permission.label}
                      </span>
                      <span className="tiny">{permission.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  )
}

function SaveIcon() {
  return <ShieldCheck size={18} />
}
