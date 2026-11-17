import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { signUp } from '../../services/auth'
import { checkPasswordStrength } from '../../lib/crypto'
import { Field, PasswordInput, SelectInput, TextInput } from '../../components/ui/forms'
import { DemoDisclaimer } from '../../components/ui/common'
import { useToast } from '../../components/ui/Feedback'
import type { User } from '../../types'

const DOC_TYPES: { value: User['docType']; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

export function RegisterScreen() {
  const { session, settings } = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    docType: 'CC' as User['docType'],
    docNumber: '',
    email: '',
    phone: '',
    birthDate: '',
    city: '',
    password: '',
    confirm: '',
  })
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) navigate('/inicio', { replace: true })
  }, [session, navigate])

  const strength = useMemo(() => checkPasswordStrength(form.password), [form.password])
  const strengthClass = form.password ? Math.min(4, Math.max(1, strength.score)) : 0

  if (!settings.features.registrationEnabled) {
    return (
      <div className="auth">
        <button type="button" className="auth-back" onClick={() => navigate('/bienvenida')}>
          ← Volver
        </button>
        <div className="empty" style={{ marginTop: '3rem' }}>
          <div className="empty__icon">
            <ShieldCheck size={26} />
          </div>
          <h1 className="empty__title">Registro no disponible</h1>
          <p className="empty__text">
            En este momento no es posible crear cuentas nuevas. Comunícate con {settings.company.name} para recibir
            ayuda.
          </p>
          <Link to="/bienvenida" className="btn btn--primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden. Verifica e intenta de nuevo.')
      return
    }
    if (!accepted) {
      setError('Debes aceptar las condiciones generales y la política de privacidad.')
      return
    }
    setLoading(true)
    try {
      await signUp({
        firstName: form.firstName,
        lastName: form.lastName,
        docType: form.docType,
        docNumber: form.docNumber,
        email: form.email,
        phone: form.phone,
        password: form.password,
        birthDate: form.birthDate || undefined,
        city: form.city || undefined,
      })
      toast.success('Tu cuenta fue creada. ¡Bienvenido a FinPoliza!')
      navigate('/inicio', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth auth--wide">
      <button type="button" className="auth-back" onClick={() => navigate('/bienvenida')}>
        ← Volver
      </button>
      <div style={{ marginBottom: '1.2rem' }}>
        <h1 className="auth__title" style={{ fontSize: '2rem' }}>
          Crea tu cuenta
        </h1>
        <p className="auth__subtitle" style={{ marginTop: '0.4rem' }}>
          Solo necesitas unos datos básicos. Tardarás menos de dos minutos.
        </p>
      </div>

      <form className="stack" onSubmit={submit} noValidate>
        {error && (
          <div className="form-error" role="alert">
            <CircleAlert size={18} style={{ flexShrink: 0, marginTop: '0.05rem' }} />
            <span>{error}</span>
          </div>
        )}

        <div className="auth-card stack">
          <TextInput
            label="Nombres"
            value={form.firstName}
            onChange={update('firstName')}
            placeholder="Ej. María Fernanda"
            autoComplete="given-name"
          />
          <TextInput
            label="Apellidos"
            value={form.lastName}
            onChange={update('lastName')}
            placeholder="Ej. López Herrera"
            autoComplete="family-name"
          />
          <SelectInput
            label="Tipo de documento"
            value={form.docType}
            onChange={(value) => setForm((f) => ({ ...f, docType: value as User['docType'] }))}
            options={DOC_TYPES}
          />
          <TextInput
            label="Número de documento"
            value={form.docNumber}
            onChange={update('docNumber')}
            placeholder="Sin puntos ni espacios"
            inputMode="numeric"
          />
          <TextInput
            label="Correo electrónico"
            value={form.email}
            onChange={update('email')}
            placeholder="tucorreo@ejemplo.com"
            type="email"
            autoComplete="email"
            inputMode="email"
          />
          <TextInput
            label="Teléfono celular"
            value={form.phone}
            onChange={update('phone')}
            placeholder="Ej. 310 555 0101"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
          />
          <div className="grid grid--2">
            <TextInput
              label="Fecha de nacimiento"
              value={form.birthDate}
              onChange={update('birthDate')}
              type="date"
              hint="Opcional"
            />
            <TextInput label="Ciudad" value={form.city} onChange={update('city')} placeholder="Ej. Bogotá" hint="Opcional" />
          </div>
        </div>

        <div className="auth-card stack">
          <Field label="Contraseña" hint="Mínimo 8 caracteres, con letras y números.">
            <PasswordInput
              value={form.password}
              onChange={update('password')}
              placeholder="Crea una contraseña"
              autoComplete="new-password"
            />
          </Field>
          {form.password && (
            <div className="password-meter" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={i <= strengthClass ? `on-${strengthClass}` : ''} />
              ))}
            </div>
          )}
          <Field label="Confirmar contraseña">
            <PasswordInput
              value={form.confirm}
              onChange={update('confirm')}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
            />
          </Field>
          {form.confirm && form.confirm !== form.password && (
            <span className="field__hint" style={{ color: '#ff9a9a' }}>
              Las contraseñas no coinciden.
            </span>
          )}
        </div>

        <label className="checkbox">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>
            Acepto las condiciones generales y la política de privacidad de {settings.company.name}. Entiendo que esta
            es una demostración.
          </span>
        </label>

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle size={20} style={{ animation: 'spin 0.9s linear infinite' }} /> Creando cuenta…
            </>
          ) : (
            <>
              Crear mi cuenta <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      <div className="auth__foot">
        <p className="small muted center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/ingresar" className="strong">
            Inicia sesión
          </Link>
        </p>
        <DemoDisclaimer />
      </div>
    </div>
  )
}
