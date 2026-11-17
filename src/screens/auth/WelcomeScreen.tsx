import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, HandHeart, Lock, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { Sheet } from '../../components/ui/Sheet'
import { DemoDisclaimer } from '../../components/ui/common'

const DEMO_USERS = [
  { name: 'María Fernanda López', email: 'maria@demo.com', password: 'Demo123*', detail: '3 seguros · fondo solidario' },
  { name: 'Carlos Andrés Ramírez', email: 'carlos@demo.com', password: 'Demo123*', detail: '2 seguros · vehículo' },
  { name: 'Rosa Elena Martínez', email: 'rosa@demo.com', password: 'Demo123*', detail: '2 seguros · ahorro' },
]

export function WelcomeScreen() {
  const { session, settings } = useAppState()
  const navigate = useNavigate()
  const [showDemo, setShowDemo] = useState(false)

  useEffect(() => {
    if (session) navigate('/inicio', { replace: true })
  }, [session, navigate])

  return (
    <div className="auth">
      <div className="brand" style={{ paddingTop: '0.5rem' }}>
        <div className="brand__mark" aria-hidden="true">
          FP
        </div>
        <div>
          <div className="brand__name">{settings.company.appName}</div>
          <div className="brand__tag">{settings.company.tagline}</div>
        </div>
      </div>

      <div className="auth__hero">
        <div>
          <span className="featured-ribbon">
            <Sparkles size={13} /> Protección y ahorro
          </span>
          <h1 className="auth__title" style={{ marginTop: '0.9rem' }}>
            Cuida a tu familia y tu dinero, en un solo lugar.
          </h1>
          <p className="auth__subtitle" style={{ marginTop: '0.8rem' }}>
            {settings.texts.welcomeMessage}
          </p>
        </div>

        <div className="stack stack--sm">
          {[
            { icon: ShieldCheck, title: 'Tus seguros al día', text: 'Consulta coberturas, cuotas y próximos pagos.' },
            { icon: HandHeart, title: 'Fondo solidario', text: 'Aporta y retira tu ahorro cuando lo necesites.' },
            { icon: Wallet, title: 'Todo claro y registrado', text: 'Cada pago y movimiento queda en tu historial.' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="row" style={{ gap: '0.85rem', alignItems: 'flex-start' }}>
                <div className="card-head__icon" style={{ width: '2.5rem', height: '2.5rem' }}>
                  <Icon size={19} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="strong" style={{ fontSize: '0.98rem' }}>
                    {item.title}
                  </div>
                  <div className="small muted">{item.text}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="auth__actions">
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => navigate('/ingresar')}>
          Iniciar sesión <ArrowRight size={20} />
        </button>
        <button type="button" className="btn btn--secondary btn--lg btn--block" onClick={() => navigate('/registro')}>
          Crear una cuenta
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => setShowDemo(true)}
          style={{ color: '#d9c47e' }}
        >
          <Lock size={16} /> Ver cuentas de demostración <ChevronRight size={16} />
        </button>
      </div>

      <div className="auth__foot">
        <DemoDisclaimer />
        <p className="tiny center">
          Al ingresar aceptas las condiciones generales y la política de privacidad de {settings.company.name}.
        </p>
      </div>

      <Sheet
        open={showDemo}
        onClose={() => setShowDemo(false)}
        title="Cuentas de demostración"
        subtitle="Elige una cuenta de cliente para explorar la aplicación. Las contraseñas de administración no se muestran aquí."
      >
        <div className="stack stack--sm">
          <div className="banner banner--gold">
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>Los datos y las operaciones de esta DEMO son ficticios. No mueven dinero real.</span>
          </div>
          <div className="list">
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                className="list-row"
                onClick={() => {
                  setShowDemo(false)
                  navigate('/ingresar', { state: { email: user.email, password: user.password } })
                }}
              >
                <span className="list-row__body">
                  <span className="list-row__title">{user.name}</span>
                  <span className="list-row__sub">
                    {user.email} · {user.detail}
                  </span>
                </span>
                <ChevronRight size={18} className="chev" />
              </button>
            ))}
          </div>
          <p className="tiny">
            Contraseña para las cuentas de cliente: <strong>Demo123*</strong>. Las credenciales administrativas se
            entregan por separado al equipo evaluador.
          </p>
        </div>
      </Sheet>
    </div>
  )
}
