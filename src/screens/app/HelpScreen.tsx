import { useState } from 'react'
import { ChevronDown, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { ScreenHeader } from '../../components/ui/common'

export function HelpScreen() {
  const { settings } = useAppState()
  const [open, setOpen] = useState<string | null>(settings.texts.faqs[0]?.id ?? null)
  const company = settings.company

  return (
    <div className="page">
      <ScreenHeader back="/perfil" title="Ayuda" subtitle="Respuestas claras para tus dudas más frecuentes." />

      <div className="banner">
        <MessageCircle size={18} style={{ flexShrink: 0 }} />
        <span>{settings.texts.helpIntro}</span>
      </div>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          Preguntas frecuentes
        </h2>
        <div className="card">
          {settings.texts.faqs.map((faq) => {
            const isOpen = open === faq.id
            return (
              <div key={faq.id} className="faq-item">
                <button
                  type="button"
                  className="faq-item__q"
                  onClick={() => setOpen(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={20}
                    style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}
                  />
                </button>
                {isOpen && <p className="faq-item__a">{faq.answer}</p>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: '0.7rem' }}>
          ¿Necesitas más ayuda?
        </h2>
        <div className="list">
          <a className="list-row" href={`tel:${company.phone.replace(/\s/g, '')}`}>
            <span className="list-row__icon list-row__icon--green">
              <Phone size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Llamar a FinPoliza</span>
              <span className="list-row__sub">{company.phone}</span>
            </span>
          </a>
          <a className="list-row" href={`mailto:${company.email}`}>
            <span className="list-row__icon list-row__icon--blue">
              <Mail size={18} />
            </span>
            <span className="list-row__body">
              <span className="list-row__title">Enviar un correo</span>
              <span className="list-row__sub">{company.email}</span>
            </span>
          </a>
        </div>
        <p className="tiny" style={{ marginTop: '0.6rem' }}>
          Horario de atención: {company.schedule}
        </p>
      </section>

      <div className="banner banner--gold" style={{ marginTop: '1.2rem' }}>
        <ShieldCheck size={18} style={{ flexShrink: 0 }} />
        <span>{settings.texts.demoDisclaimer}</span>
      </div>
    </div>
  )
}
