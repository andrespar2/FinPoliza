import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { resetPasswordDemo } from '../../services/auth'
import { checkPasswordStrength } from '../../lib/crypto'
import { Field, PasswordInput, TextInput } from '../../components/ui/forms'
import { BrandMark, DemoDisclaimer } from '../../components/ui/common'
import { useToast } from '../../components/ui/Feedback'

export function ForgotPasswordScreen() {
  const { users, settings } = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const verifyIdentity = () => {
    setError(null)
    const match = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.docNumber === docNumber.trim(),
    )
    if (!match) {
      setError('Los datos no coinciden con ninguna cuenta. Verifica el correo y el número de documento.')
      return
    }
    if (match.status !== 'active') {
      setError('Esta cuenta no está activa. Comunícate con FinPoliza para recibir ayuda.')
      return
    }
    setStep(2)
  }

  const changePassword = async () => {
    setError(null)
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    const strength = checkPasswordStrength(password)
    if (!strength.valid) {
      setError(`La contraseña no es segura. ${strength.problems.join(' ')}`)
      return
    }
    setLoading(true)
    try {
      await resetPasswordDemo(email, docNumber, password)
      setStep(3)
      toast.success('Contraseña restablecida correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <button type="button" className="auth-back" onClick={() => navigate('/ingresar')}>
        ← Volver a ingresar
      </button>

      <div className="brand" style={{ marginBottom: '1.4rem' }}>
        <BrandMark />
        <div>
          <div className="brand__name">{settings.company.appName}</div>
          <div className="brand__tag">Recuperar acceso</div>
        </div>
      </div>

      {step === 1 && (
        <>
          <h1 className="auth__title" style={{ fontSize: '1.85rem' }}>
            Recupera tu contraseña
          </h1>
          <p className="auth__subtitle" style={{ marginTop: '0.45rem', marginBottom: '1.2rem' }}>
            Confirma tu identidad con el correo y el documento registrados en tu cuenta.
          </p>
          <form
            className="auth-card stack"
            onSubmit={(e) => {
              e.preventDefault()
              verifyIdentity()
            }}
          >
            {error && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
              </div>
            )}
            <TextInput
              label="Correo electrónico"
              value={email}
              onChange={setEmail}
              placeholder="tucorreo@ejemplo.com"
              type="email"
              inputMode="email"
              autoComplete="email"
            />
            <TextInput
              label="Número de documento"
              value={docNumber}
              onChange={setDocNumber}
              placeholder="Sin puntos ni espacios"
              inputMode="numeric"
            />
            <button type="submit" className="btn btn--primary btn--block">
              Continuar <ArrowRight size={19} />
            </button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="auth__title" style={{ fontSize: '1.85rem' }}>
            Crea una nueva contraseña
          </h1>
          <p className="auth__subtitle" style={{ marginTop: '0.45rem', marginBottom: '1.2rem' }}>
            Usa al menos 8 caracteres, con letras y números. No uses datos fáciles de adivinar.
          </p>
          <form
            className="auth-card stack"
            onSubmit={(e) => {
              e.preventDefault()
              void changePassword()
            }}
          >
            {error && (
              <div className="form-error" role="alert">
                <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
              </div>
            )}
            <Field label="Nueva contraseña">
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmar contraseña">
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
            </Field>
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? <LoaderCircle size={20} style={{ animation: 'spin 0.9s linear infinite' }} /> : null}
              Guardar contraseña
            </button>
          </form>
        </>
      )}

      {step === 3 && (
        <div className="auth-card center stack" style={{ marginTop: '2rem' }}>
          <div className="success-mark">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="sheet__title">Contraseña actualizada</h1>
          <p className="small muted">
            Ya puedes ingresar con tu nueva contraseña. Por seguridad, te recomendamos no compartirla con nadie.
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/ingresar')}>
            Ir a iniciar sesión
          </button>
        </div>
      )}

      <div className="auth__foot">
        <div className="banner">
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span>
            En esta DEMO la recuperación es inmediata y no envía correos reales. En producción se verificará tu identidad
            por un canal seguro.
          </span>
        </div>
        <DemoDisclaimer />
      </div>
    </div>
  )
}
