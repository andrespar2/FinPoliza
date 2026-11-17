import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircleAlert, Info, LoaderCircle, Save } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { createUser, updateUser, type AdminUserInput } from '../../services/usersAdmin'
import { AdminHeader, NoPermission } from '../../components/admin/AdminUI'
import { Field, PasswordInput, SelectInput, TextInput } from '../../components/ui/forms'
import { useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'
import type { User } from '../../types'

export function AdminUserForm() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const { id } = useParams()
  const session = state.session!
  const editing = state.users.find((u) => u.id === id)
  const isEdit = Boolean(id)

  const [form, setForm] = useState<AdminUserInput>({
    firstName: editing?.firstName ?? '',
    lastName: editing?.lastName ?? '',
    docType: editing?.docType ?? 'CC',
    docNumber: editing?.docNumber ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    address: editing?.address ?? '',
    city: editing?.city ?? '',
    birthDate: editing?.birthDate ?? '',
    roleId: editing?.roleId ?? 'role_user',
    status: editing?.status ?? 'active',
    password: '',
    notes: editing?.notes ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!hasPermission(session, 'users.manage')) {
    return (
      <>
        <AdminHeader title={isEdit ? 'Editar usuario' : 'Nuevo usuario'} back="/admin/usuarios" />
        <NoPermission permission="users.manage" />
      </>
    )
  }

  const update = (key: keyof AdminUserInput) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isEdit && editing) {
        await updateUser(editing.id, form)
        toast.success('Usuario actualizado correctamente.')
        navigate(`/admin/usuarios/${editing.id}`)
      } else {
        const created = await createUser(form)
        toast.success('Usuario creado correctamente.')
        navigate(`/admin/usuarios/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminHeader
        title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        subtitle={isEdit ? 'Actualiza los datos del cliente o del miembro del equipo.' : 'Crea una cuenta de cliente o de equipo.'}
        back={isEdit && editing ? `/admin/usuarios/${editing.id}` : '/admin/usuarios'}
      />

      <form className="stack" onSubmit={save}>
        {error && (
          <div className="form-error" role="alert">
            <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
          </div>
        )}

        <section className="card stack">
          <h2 className="card-title">Datos personales</h2>
          <div className="grid grid--2">
            <TextInput label="Nombres" value={form.firstName} onChange={update('firstName')} placeholder="Nombres" />
            <TextInput label="Apellidos" value={form.lastName} onChange={update('lastName')} placeholder="Apellidos" />
          </div>
          <div className="grid grid--2">
            <SelectInput
              label="Tipo de documento"
              value={form.docType}
              onChange={(v) => setForm((f) => ({ ...f, docType: v as User['docType'] }))}
              options={[
                { value: 'CC', label: 'Cédula de ciudadanía' },
                { value: 'CE', label: 'Cédula de extranjería' },
                { value: 'PA', label: 'Pasaporte' },
                { value: 'NIT', label: 'NIT' },
              ]}
            />
            <TextInput label="Número de documento" value={form.docNumber} onChange={update('docNumber')} inputMode="numeric" />
          </div>
          <div className="grid grid--2">
            <TextInput label="Fecha de nacimiento" value={form.birthDate} onChange={update('birthDate')} type="date" />
            <TextInput label="Ciudad" value={form.city} onChange={update('city')} placeholder="Ciudad" />
          </div>
          <TextInput label="Dirección" value={form.address} onChange={update('address')} placeholder="Dirección de residencia" />
          <div className="grid grid--2">
            <TextInput label="Correo electrónico" value={form.email} onChange={update('email')} type="email" inputMode="email" />
            <TextInput label="Teléfono" value={form.phone} onChange={update('phone')} type="tel" inputMode="tel" />
          </div>
        </section>

        <section className="card stack">
          <h2 className="card-title">Acceso y permisos</h2>
          <div className="grid grid--2">
            <Field label="Rol">
              <select
                className="select"
                value={form.roleId}
                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
              >
                {state.roles
                  .filter((r) => r.level !== 'owner' || session.roleLevel === 'owner')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Estado de la cuenta">
              <select
                className="select"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as User['status'] }))}
              >
                <option value="active">Activa</option>
                <option value="suspended">Suspendida</option>
                <option value="inactive">Inactiva</option>
              </select>
            </Field>
          </div>

          {!isEdit && (
            <>
              <Field label="Contraseña inicial" hint="Si la dejas vacía se usará FinPoliza2026*">
                <PasswordInput
                  value={form.password ?? ''}
                  onChange={update('password')}
                  placeholder="Contraseña inicial"
                  autoComplete="new-password"
                />
              </Field>
              <div className="banner banner--gold">
                <Info size={17} style={{ flexShrink: 0 }} />
                <span>Comparte la contraseña inicial de forma segura. En producción se enviará por correo verificado.</span>
              </div>
            </>
          )}

          <Field label="Notas internas" hint="Opcional. No visible para el usuario.">
            <textarea
              className="textarea"
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Ej. Cliente preferencial"
            />
          </Field>
        </section>

        <div className="btn-row">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? (
              <>
                <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> Guardando…
              </>
            ) : (
              <>
                <Save size={19} /> {isEdit ? 'Guardar cambios' : 'Crear usuario'}
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate(isEdit && editing ? `/admin/usuarios/${editing.id}` : '/admin/usuarios')}
          >
            Cancelar
          </button>
        </div>
        {isEdit && (
          <p className="tiny">Los cambios en los datos del usuario se registran en el historial de auditoría.</p>
        )}
      </form>
    </>
  )
}
