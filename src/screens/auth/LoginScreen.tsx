import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { signIn } from '../../services/auth'
import { Field, PasswordInput } from '../../components/ui/forms'
import { DemoDisclaimer } from '../../components/ui/common'
import { useToast } from '../../components/ui/Feedback'

const QUICK = [
  { label: 'María', email: 'maria@demo.com', password: 'Demo123*' },
  { label: 'Carlos', email: 'carlos@demo.com', password: 'Demo123*' },
  { label: 'Rosa', email: 'rosa@demo.com', password: 'Demo123*' },
]

export function LoginScreen() {
  const { session, settings } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const prefill = (location.state as { email?: string; password?: string } | null) ?? null
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [password, setPassword] = useState(prefill?.password ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) navigate('/inicio', { replace: true })
  }, [session, navigate])

  const submit = async () => {
    setError(null)
    if (!email.trim() || !password) {
      setError('Escribe tu correo y tu contraseña para continuar.')
      return
    }
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Bienvenido de nuevo a FinPoliza.')
      navigate('/inicio', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth auth--wide">
      <button type="button" className="auth-back" onClick={() => navigate('/bienvenida')}>
        ← Volver
      </button>

      <div className="brand" style={{ marginBottom: '1.6rem' }}>
        <div className="brand__mark" aria-hidden="true">
          FP
        </div>
        <div>
          <div className="brand__name">{settings.company.appName}</div>
          <div className="brand__tag">{settings.company.tagline}</div>
        </div>
      </div>

      <div style={{ marginBottom: '1.3rem' }}>
        <h1 className="auth__title" style={{ fontSize: '2.1rem' }}>
          Hola de nuevo
        </h1>
        <p className="auth__subtitle" style={{ marginTop: '0.45rem' }}>
          {settings.texts.loginMessage}
        </p>
      </div>

      <form
        className="auth-card stack"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {error && (
          <div className="form-error" role="alert">
            <CircleAlert size={18} style={{ flexShrink: 0, marginTop: '0.05rem' }} />
            <span>{error}</span>
          </div>
        )}

        <Field label="Correo electrónico">
          <div className="input-group">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              inputMode="email"
              style={{ paddingRight: '3rem' }}
            />
            <span className="input-group__icon" aria-hidden="true">
              <Mail size={20} />
            </span>
          </div>
        </Field>

        <Field
          label="Contraseña"
          action={
            <Link to="/recuperar" style={{ fontSize: '0.85rem', fontWeight: 650 }}>
              ¿Olvidaste tu contraseña?
            </Link>
          }
        >
          <PasswordInput value={password} onChange={setPassword} placeholder="Tu contraseña" />
        </Field>

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle size={20} className="spin" style={{ animation: 'spin 0.9s linear infinite' }} />
              Ingresando…
            </>
          ) : (
            <>
              Ingresar <ArrowRight size={20} />
            </>
          )}
        </button>

        <div className="divider" />
        <div>
          <p className="tiny" style={{ marginBottom: '0.5rem' }}>
            Acceso rápido con una cuenta de prueba:
          </p>
          <div className="chip-row">
            {QUICK.map((user) => (
              <button
                key={user.email}
                type="button"
                className="chip chip--button"
                onClick={() => {
                  setEmail(user.email)
                  setPassword(user.password)
                  setError(null)
                }}
              >
                {user.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div className="auth__foot">
        <p className="small muted center">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="strong">
            Regístrate aquí
          </Link>
        </p>
        <DemoDisclaimer />
        <p className="tiny center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
          <LockKeyhole size={13} /> Tu sesión se mantiene abierta en este dispositivo.
        </p>
      </div>
    </div>
  )
}
