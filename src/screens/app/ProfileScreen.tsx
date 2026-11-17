import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  ChevronRight,
  CircleHelp,
  FileText,
  KeyRound,
  LogOut,
  Pencil,
  ShieldCheck,
  Type,
  UserCircle2,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { signOut } from '../../services/auth'
import { formatDate, formatMoney, initials } from '../../lib/format'
import { useToast, useConfirm } from '../../components/ui/Feedback'
import { ScreenHeader, UserStatusBadge } from '../../components/ui/common'
import { InfoRow } from '../../components/ui/common'
import { canAccessAdmin, notificationsForUser, isNotificationRead, userFundSummary } from '../../services/selectors'

export function ProfileScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const session = state.session!
  const user = state.users.find((u) => u.id === session.id)
  const notifications = useMemo(() => notificationsForUser(state, session.id), [state, session.id])
  const unread = notifications.filter((n) => !isNotificationRead(n, session.id)).length
  const fund = userFundSummary(state, session.id)
  const [scale, setScale] = useState(state.settings.appearance.textScale)

  if (!user) return null

  const changeScale = (value: 'normal' | 'large' | 'xlarge') => {
    setScale(value)
    localStorage.setItem('finpoliza.textScale', value)
    document.documentElement.dataset.textScale = value
    document.documentElement.style.fontSize = value === 'large' ? '18.5px' : value === 'xlarge' ? '20px' : '17px'
    toast.success('Tamaño de texto actualizado.')
  }

  const logout = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Deseas salir de tu cuenta en este dispositivo? Tus datos permanecerán guardados.',
      confirmLabel: 'Cerrar sesión',
      danger: true,
    })
    if (!ok) return
    await signOut()
    toast.info('Sesión cerrada correctamente.')
    navigate('/bienvenida', { replace: true })
  }

  return (
    <div className="page">
      <ScreenHeader title="Mi perfil" subtitle="Tus datos personales y preferencias." />

      <section className="card" style={{ padding: 0 }}>
        <div className="profile-head">
          <div className="avatar avatar--lg">{initials(user.firstName, user.lastName)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="profile-head__name">
              {user.firstName} {user.lastName}
            </div>
            <div className="tiny" style={{ marginTop: '0.15rem' }}>
              {user.email}
            </div>
            <div className="row" style={{ gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
              <UserStatusBadge status={user.status} />
              <span className="badge badge--gold">{session.roleName}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border)' }}>
            <div className="tiny">Fondo solidario</div>
            <div className="strong money text-green">{formatMoney(fund.balance)}</div>
          </div>
          <div style={{ padding: '0.85rem 1rem' }}>
            <div className="tiny">Cliente desde</div>
            <div className="strong">{formatDate(user.createdAt)}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Datos personales</h2>
          <button type="button" className="section-link" onClick={() => navigate('/perfil/editar')}>
            <Pencil size={14} /> Editar
          </button>
        </div>
        <div className="card card--flat">
          <InfoRow label="Documento" value={`${user.docType} ${user.docNumber}`} />
          <InfoRow label="Correo" value={user.email} />
          <InfoRow label="Teléfono" value={user.phone} />
          <InfoRow label="Dirección" value={user.address || 'No registrada'} />
          <InfoRow label="Ciudad" value={user.city || 'No registrada'} />
          <InfoRow label="Fecha de registro" value={formatDate(user.createdAt)} />
          <InfoRow label="Estado de la cuenta" value={<UserStatusBadge status={user.status} />} />
        </div>
        <p className="tiny" style={{ marginTop: '0.5rem' }}>
          Tu documento de identidad solo puede ser modificado por un asesor de FinPoliza.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Accesos
        </h2>
        <div className="list">
          {canAccessAdmin(session) && (
            <button type="button" className="list-row" onClick={() => navigate('/admin')}>
              <span className="list-row__icon list-row__icon--blue">
                <ShieldCheck size={19} />
              </span>
              <span className="list-row__body">
                <span className="list-row__title">Panel administrativo</span>
                <span className="list-row__sub">Gestiona usuarios, seguros y pagos</span>
              </span>
              <ChevronRight size={18} className="chev" />
            </button>
          )}
          <button type="button" className="list-row" onClick={() => navigate('/notificaciones')}>
            <span className="list-row__icon">
              <Bell size={19} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Notificaciones</span>
              <span className="list-row__sub">{unread > 0 ? `${unread} sin leer` : 'Todo al día'}</span>
            </span>
            {unread > 0 && <span className="badge badge--red">{unread}</span>}
            <ChevronRight size={18} className="chev" />
          </button>
          <button type="button" className="list-row" onClick={() => navigate('/perfil/password')}>
            <span className="list-row__icon">
              <KeyRound size={19} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Cambiar contraseña</span>
              <span className="list-row__sub">Mantén tu cuenta segura</span>
            </span>
            <ChevronRight size={18} className="chev" />
          </button>
          <button type="button" className="list-row" onClick={() => navigate('/perfil/empresa')}>
            <span className="list-row__icon">
              <Building2 size={19} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Información de la empresa</span>
              <span className="list-row__sub">Quiénes somos y cómo contactarnos</span>
            </span>
            <ChevronRight size={18} className="chev" />
          </button>
          <button type="button" className="list-row" onClick={() => navigate('/perfil/ayuda')}>
            <span className="list-row__icon">
              <CircleHelp size={19} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Ayuda y preguntas frecuentes</span>
              <span className="list-row__sub">Resuelve tus dudas en segundos</span>
            </span>
            <ChevronRight size={18} className="chev" />
          </button>
          <button type="button" className="list-row" onClick={() => navigate('/perfil/empresa')}>
            <span className="list-row__icon">
              <FileText size={19} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Condiciones y privacidad</span>
              <span className="list-row__sub">Consulta los términos de la DEMO</span>
            </span>
            <ChevronRight size={18} className="chev" />
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Tamaño del texto
        </h2>
        <div className="card card--flat">
          <div className="row" style={{ gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Type size={18} className="dim" />
            <p className="small muted">Elige el tamaño con el que te sientas más cómodo.</p>
          </div>
          <div className="segmented">
            {[
              { key: 'normal', label: 'Normal' },
              { key: 'large', label: 'Grande' },
              { key: 'xlarge', label: 'Muy grande' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={`segmented__item ${scale === option.key ? 'segmented__item--active' : ''}`}
                onClick={() => changeScale(option.key as 'normal' | 'large' | 'xlarge')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="banner">
          <UserCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>
            Tu cuenta es de demostración. Ningún dato personal real es necesario y toda la información se guarda
            únicamente en este dispositivo.
          </span>
        </div>
        <button type="button" className="btn btn--soft-danger btn--block" style={{ marginTop: '1rem' }} onClick={() => void logout()}>
          <LogOut size={19} /> Cerrar sesión
        </button>
      </section>
    </div>
  )
}
