import { useState } from 'react'
import {
  Building2,
  CalendarClock,
  ChevronDown,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { BrandMark, ScreenHeader } from '../../components/ui/common'

export function CompanyInfoScreen() {
  const { settings } = useAppState()
  const company = settings.company
  const [openLegal, setOpenLegal] = useState<'terms' | 'privacy' | null>(null)

  return (
    <div className="page">
      <ScreenHeader back="/perfil" title="Nuestra empresa" subtitle="Conoce a FinPoliza y cómo contactarnos." />

      <section className="hero hero--neutral">
        <div className="row" style={{ gap: '0.9rem', alignItems: 'center' }}>
          <BrandMark size="lg" />
          <div>
            <div className="hero__eyebrow">Compañía de seguros</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.035em', marginTop: '0.15rem' }}>
              {company.legalName}
            </h2>
            <div className="hero__meta">{company.tagline}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Quiénes somos
        </h2>
        <div className="card">
          <p className="small muted" style={{ lineHeight: 1.6 }}>
            {company.description}
          </p>
          <div className="divider" />
          <div className="stack stack--sm">
            <div>
              <span className="tag">Misión</span>
              <p className="small muted" style={{ marginTop: '0.2rem', lineHeight: 1.55 }}>
                {company.mission}
              </p>
            </div>
            <div>
              <span className="tag">Visión</span>
              <p className="small muted" style={{ marginTop: '0.2rem', lineHeight: 1.55 }}>
                {company.vision}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Contacto
        </h2>
        <div className="list">
          <a className="list-row" href={`tel:${company.phone.replace(/\s/g, '')}`}>
            <span className="list-row__icon list-row__icon--green">
              <Phone size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Llámanos</span>
              <span className="list-row__sub">{company.phone}</span>
            </span>
          </a>
          <a className="list-row" href={`mailto:${company.email}`}>
            <span className="list-row__icon list-row__icon--blue">
              <Mail size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Escríbenos</span>
              <span className="list-row__sub">{company.email}</span>
            </span>
          </a>
          <a className="list-row" href={`https://${company.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer">
            <span className="list-row__icon">
              <Globe size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Sitio web</span>
              <span className="list-row__sub">{company.website}</span>
            </span>
          </a>
          <div className="list-row">
            <span className="list-row__icon">
              <MapPin size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Oficina principal</span>
              <span className="list-row__sub">
                {company.address} · {company.city}
              </span>
            </span>
          </div>
          <div className="list-row">
            <span className="list-row__icon">
              <CalendarClock size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Horario de atención</span>
              <span className="list-row__sub">{company.schedule}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Información legal
        </h2>
        <div className="list">
          <button type="button" className="list-row" onClick={() => setOpenLegal(openLegal === 'terms' ? null : 'terms')}>
            <span className="list-row__icon">
              <Building2 size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Condiciones generales</span>
              <span className="list-row__sub">Términos de uso de la aplicación</span>
            </span>
            <ChevronDown size={19} style={{ transform: openLegal === 'terms' ? 'rotate(180deg)' : undefined }} />
          </button>
          {openLegal === 'terms' && (
            <div style={{ padding: '0.95rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <p className="small muted" style={{ lineHeight: 1.55 }}>
                {settings.texts.terms}
              </p>
            </div>
          )}
          <button type="button" className="list-row" onClick={() => setOpenLegal(openLegal === 'privacy' ? null : 'privacy')}>
            <span className="list-row__icon">
              <ShieldCheck size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Política de privacidad</span>
              <span className="list-row__sub">Cómo protegemos tus datos</span>
            </span>
            <ChevronDown size={19} style={{ transform: openLegal === 'privacy' ? 'rotate(180deg)' : undefined }} />
          </button>
          {openLegal === 'privacy' && (
            <div style={{ padding: '0.95rem 1rem' }}>
              <p className="small muted" style={{ lineHeight: 1.55 }}>
                {settings.texts.privacy}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="banner banner--gold" style={{ marginTop: '1.2rem' }}>
        <ShieldCheck size={18} style={{ flexShrink: 0 }} />
        <span>{settings.texts.demoDisclaimer}</span>
      </div>
      <p className="tiny center" style={{ marginTop: '1rem' }}>
        FinPoliza · Versión 1.0.0 · Aplicación de demostración
      </p>
    </div>
  )
}
