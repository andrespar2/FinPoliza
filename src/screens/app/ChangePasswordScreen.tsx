import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { changeOwnPassword } from '../../services/auth'
import { checkPasswordStrength } from '../../lib/crypto'
import { ScreenHeader } from '../../components/ui/common'
import { Field, PasswordInput } from '../../components/ui/forms'
import { useToast } from '../../components/ui/Feedback'

export function ChangePasswordScreen() {
  const { session } = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  if (!session) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (next !== confirm) {
      setError('La nueva contraseña y su confirmación no coinciden.')
      return
    }
    const strength = checkPasswordStrength(next)
    if (!strength.valid) {
      setError(`La contraseña no es segura. ${strength.problems.join(' ')}`)
      return
    }
    setSaving(true)
    try {
      await changeOwnPassword(session.id, current, next)
      setDone(true)
      toast.success('Contraseña actualizada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <ScreenHeader back="/perfil" title="Cambiar contraseña" subtitle="Usa una contraseña segura y fácil de recordar." />

      {done ? (
        <div className="card card--pad-lg stack center" style={{ alignItems: 'center' }}>
          <div className="success-mark">
            <CheckCircle2 size={38} />
          </div>
          <h2 className="sheet__title">Contraseña actualizada</h2>
          <p className="small muted">Desde ahora ingresa con tu nueva contraseña.</p>
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/perfil')}>
            Volver a mi perfil
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          {error && (
            <div className="form-error" role="alert">
              <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
            </div>
          )}
          <div className="card stack">
            <Field label="Contraseña actual">
              <PasswordInput value={current} onChange={setCurrent} placeholder="Tu contraseña actual" />
            </Field>
            <Field label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números.">
              <PasswordInput
                value={next}
                onChange={setNext}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmar nueva contraseña">
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="banner">
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>Por seguridad, no compartas tu contraseña. FinPoliza nunca te la pedirá por teléfono ni por mensaje.</span>
          </div>
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={saving}>
            {saving ? (
              <>
                <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> Guardando…
              </>
            ) : (
              'Actualizar contraseña'
            )}
          </button>
        </form>
      )}
    </div>
  )
}
