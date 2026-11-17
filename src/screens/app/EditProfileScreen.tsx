import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, CircleAlert, LoaderCircle, Lock } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { updateOwnProfile } from '../../services/auth'
import { ScreenHeader } from '../../components/ui/common'
import { TextInput } from '../../components/ui/forms'
import { useToast } from '../../components/ui/Feedback'

export function EditProfileScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const session = state.session!
  const user = state.users.find((u) => u.id === session.id)
  const [form, setForm] = useState({
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
    city: user?.city ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateOwnProfile(user.id, form)
      toast.success('Tus datos se actualizaron correctamente.')
      navigate('/perfil')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <ScreenHeader back="/perfil" title="Editar mis datos" subtitle="Actualiza tu información de contacto." />

      <form className="stack" onSubmit={save}>
        {error && (
          <div className="form-error" role="alert">
            <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
          </div>
        )}

        <div className="card card--flat stack">
          <div className="row" style={{ gap: '0.55rem', alignItems: 'flex-start' }}>
            <Lock size={17} className="dim" style={{ marginTop: '0.15rem' }} />
            <p className="tiny">
              Nombre y documento no se pueden modificar desde la app. Si necesitas corregirlos, comunícate con
              FinPoliza.
            </p>
          </div>
          <div className="card card--flat" style={{ margin: 0 }}>
            <div className="info-item">
              <span className="info-item__label">Nombre</span>
              <span className="info-item__value">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <div className="info-item">
              <span className="info-item__label">Documento</span>
              <span className="info-item__value">
                {user.docType} {user.docNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="card stack">
          <TextInput
            label="Correo electrónico"
            value={form.email}
            onChange={update('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
          <TextInput
            label="Teléfono celular"
            value={form.phone}
            onChange={update('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
          <TextInput label="Dirección" value={form.address} onChange={update('address')} placeholder="Ej. Carrera 45 # 12-30" />
          <TextInput label="Ciudad" value={form.city} onChange={update('city')} placeholder="Ej. Bogotá" />
        </div>

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={saving}>
          {saving ? (
            <>
              <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> Guardando…
            </>
          ) : (
            <>
              <CheckCircle2 size={19} /> Guardar cambios
            </>
          )}
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('/perfil')}>
          Cancelar
        </button>
      </form>
    </div>
  )
}
