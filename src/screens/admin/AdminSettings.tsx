import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CircleAlert,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Trash2,
} from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { updateSettings } from '../../services/settings'
import { AdminHeader, NoPermission } from '../../components/admin/AdminUI'
import { Field, MoneyInput, SelectInput, TextInput } from '../../components/ui/forms'
import { useConfirm, useToast } from '../../components/ui/Feedback'
import { hasPermission, store } from '../../services/store'
import { signOut } from '../../services/auth'
import { parseAmount } from '../../lib/format'
import type { AppSettings, FaqItem, Periodicity } from '../../types'
import { uid } from '../../lib/id'

type Tab = 'empresa' | 'regional' | 'textos' | 'fondo' | 'seguros' | 'funciones' | 'mensajes' | 'demo'

const TABS: { key: Tab; label: string }[] = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'regional', label: 'Moneda y fechas' },
  { key: 'textos', label: 'Textos y ayuda' },
  { key: 'fondo', label: 'Fondo solidario' },
  { key: 'seguros', label: 'Seguros' },
  { key: 'funciones', label: 'Funcionalidades' },
  { key: 'mensajes', label: 'Mensajes' },
  { key: 'demo', label: 'Datos demo' },
]

export function AdminSettings() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const session = state.session!
  const settings = state.settings
  const [tab, setTab] = useState<Tab>('empresa')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [company, setCompany] = useState(settings.company)
  const [regional, setRegional] = useState(settings.regional)
  const [texts, setTexts] = useState(settings.texts)
  const [faqs, setFaqs] = useState<FaqItem[]>(settings.texts.faqs)
  const [fund, setFund] = useState(settings.fund)
  const [fundRules, setFundRules] = useState(settings.fund.rules.join('\n'))
  const [fundAmounts, setFundAmounts] = useState(settings.fund.suggestedAmounts.join(', '))
  const [insurance, setInsurance] = useState(settings.insurance)
  const [features, setFeatures] = useState(settings.features)
  const [appearance, setAppearance] = useState(settings.appearance)
  const [messages, setMessages] = useState(settings.notifications)
  const [resetBusy, setResetBusy] = useState(false)

  if (!hasPermission(session, 'settings.manage')) {
    return (
      <>
        <AdminHeader title="Configuración" />
        <NoPermission permission="settings.manage" />
      </>
    )
  }

  const save = async (patch: Partial<AppSettings>, description: string) => {
    setError(null)
    setSaving(true)
    try {
      await updateSettings(patch, description)
      toast.success('Configuración guardada correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  const resetDemo = async () => {
    const ok = await confirm({
      title: 'Restablecer datos de demostración',
      message:
        'Se eliminarán todos los cambios realizados y se restaurarán los datos iniciales de la DEMO. Esta acción no se puede deshacer.',
      confirmLabel: 'Restablecer demo',
      danger: true,
    })
    if (!ok) return
    setResetBusy(true)
    try {
      await store.seedDatabase()
      await store.refresh()
      await signOut()
      toast.success('Datos de demostración restablecidos.')
      navigate('/bienvenida', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron restablecer los datos.')
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <>
      <AdminHeader
        title="Configuración global"
        subtitle="Personaliza la información, los textos y las funcionalidades de la aplicación."
        actions={
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate('/admin/fondo')}>
            <Settings size={16} /> Ver fondo
          </button>
        }
      />

      <div className="admin-tabs" style={{ marginBottom: '1rem' }}>
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`admin-nav__item ${tab === item.key ? 'admin-nav__item--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: '1rem' }} role="alert">
          <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
        </div>
      )}

      {tab === 'empresa' && (
        <div className="stack">
          <section className="card stack">
            <h2 className="card-title">Identidad de la empresa</h2>
            <div className="grid grid--2">
              <TextInput label="Nombre comercial" value={company.name} onChange={(v) => setCompany((c) => ({ ...c, name: v }))} />
              <TextInput label="Razón social" value={company.legalName} onChange={(v) => setCompany((c) => ({ ...c, legalName: v }))} />
            </div>
            <div className="grid grid--2">
              <TextInput label="Nombre de la aplicación" value={company.appName} onChange={(v) => setCompany((c) => ({ ...c, appName: v }))} />
              <TextInput label="Eslogan" value={company.tagline} onChange={(v) => setCompany((c) => ({ ...c, tagline: v }))} />
            </div>
            <Field label="Descripción institucional">
              <textarea className="textarea" rows={4} value={company.description} onChange={(e) => setCompany((c) => ({ ...c, description: e.target.value }))} />
            </Field>
            <div className="grid grid--2">
              <Field label="Misión">
                <textarea className="textarea" rows={3} value={company.mission} onChange={(e) => setCompany((c) => ({ ...c, mission: e.target.value }))} />
              </Field>
              <Field label="Visión">
                <textarea className="textarea" rows={3} value={company.vision} onChange={(e) => setCompany((c) => ({ ...c, vision: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid--2">
              <TextInput label="Teléfono" value={company.phone} onChange={(v) => setCompany((c) => ({ ...c, phone: v }))} />
              <TextInput label="Correo" value={company.email} onChange={(v) => setCompany((c) => ({ ...c, email: v }))} />
            </div>
            <div className="grid grid--2">
              <TextInput label="Dirección" value={company.address} onChange={(v) => setCompany((c) => ({ ...c, address: v }))} />
              <TextInput label="Ciudad / país" value={company.city} onChange={(v) => setCompany((c) => ({ ...c, city: v }))} />
            </div>
            <div className="grid grid--2">
              <TextInput label="Sitio web" value={company.website} onChange={(v) => setCompany((c) => ({ ...c, website: v }))} />
              <TextInput label="Horario de atención" value={company.schedule} onChange={(v) => setCompany((c) => ({ ...c, schedule: v }))} />
            </div>
            <TextInput
              label="URL del logotipo"
              value={company.logoUrl}
              onChange={(v) => setCompany((c) => ({ ...c, logoUrl: v }))}
              hint="Opcional. La marca FP se usa por defecto."
            />
          </section>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => void save({ company }, 'Actualizó la información institucional de la empresa.')}
          >
            {saving ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <Save size={19} />}
            Guardar información
          </button>
        </div>
      )}

      {tab === 'regional' && (
        <div className="stack">
          <section className="card stack">
            <h2 className="card-title">Moneda y formato</h2>
            <div className="grid grid--2">
              <TextInput
                label="Código de moneda"
                value={regional.currency}
                onChange={(v) => setRegional((r) => ({ ...r, currency: v.toUpperCase() }))}
                hint="ISO 4217. Ej. COP, USD, MXN."
              />
              <TextInput
                label="Región"
                value={regional.locale}
                onChange={(v) => setRegional((r) => ({ ...r, locale: v }))}
                hint="Ej. es-CO, es-MX, en-US."
              />
            </div>
            <SelectInput
              label="Formato de fecha"
              value={regional.dateFormat}
              onChange={(v) => setRegional((r) => ({ ...r, dateFormat: v }))}
              options={[
                { value: 'dd/MM/yyyy', label: '31/12/2026' },
                { value: 'MM/dd/yyyy', label: '12/31/2026' },
                { value: 'yyyy-MM-dd', label: '2026-12-31' },
                { value: 'd MMMM yyyy', label: '31 de diciembre de 2026' },
                { value: 'dd MMM yyyy', label: '31 dic 2026' },
              ]}
            />
            <TextInput label="Zona horaria" value={regional.timezone} onChange={(v) => setRegional((r) => ({ ...r, timezone: v }))} />
            <div className="banner">
              <CircleAlert size={17} style={{ flexShrink: 0 }} />
              <span>El formato se aplica de inmediato a precios, fechas y movimientos de toda la aplicación.</span>
            </div>
          </section>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => void save({ regional }, 'Actualizó la configuración regional y de moneda.')}
          >
            <Save size={19} /> Guardar configuración regional
          </button>
        </div>
      )}

      {tab === 'textos' && (
        <div className="stack">
          <section className="card stack">
            <h2 className="card-title">Textos de la aplicación</h2>
            <Field label="Mensaje de bienvenida (pantalla inicial)">
              <textarea className="textarea" rows={3} value={texts.welcomeMessage} onChange={(e) => setTexts((t) => ({ ...t, welcomeMessage: e.target.value }))} />
            </Field>
            <Field label="Mensaje en el inicio de sesión">
              <textarea className="textarea" rows={2} value={texts.loginMessage} onChange={(e) => setTexts((t) => ({ ...t, loginMessage: e.target.value }))} />
            </Field>
            <Field label="Texto del banner del inicio">
              <textarea className="textarea" rows={2} value={texts.homeBanner} onChange={(e) => setTexts((t) => ({ ...t, homeBanner: e.target.value }))} />
            </Field>
            <Field label="Introducción de ayuda">
              <textarea className="textarea" rows={3} value={texts.helpIntro} onChange={(e) => setTexts((t) => ({ ...t, helpIntro: e.target.value }))} />
            </Field>
            <Field label="Aviso de demostración">
              <textarea className="textarea" rows={2} value={texts.demoDisclaimer} onChange={(e) => setTexts((t) => ({ ...t, demoDisclaimer: e.target.value }))} />
            </Field>
            <Field label="Condiciones generales">
              <textarea className="textarea" rows={5} value={texts.terms} onChange={(e) => setTexts((t) => ({ ...t, terms: e.target.value }))} />
            </Field>
            <Field label="Política de privacidad">
              <textarea className="textarea" rows={5} value={texts.privacy} onChange={(e) => setTexts((t) => ({ ...t, privacy: e.target.value }))} />
            </Field>
          </section>

          <section className="card stack">
            <div className="row row--between">
              <h2 className="card-title">Preguntas frecuentes</h2>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setFaqs((f) => [...f, { id: uid('faq'), question: '', answer: '' }])}
              >
                <Plus size={15} /> Agregar
              </button>
            </div>
            {faqs.map((faq, index) => (
              <div key={faq.id} className="card card--flat stack stack--sm" style={{ margin: 0 }}>
                <div className="row">
                  <input
                    className="input"
                    value={faq.question}
                    placeholder="Pregunta"
                    aria-label="Pregunta"
                    onChange={(e) =>
                      setFaqs((list) => list.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)))
                    }
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Eliminar pregunta"
                    onClick={() => setFaqs((list) => list.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  className="textarea"
                  rows={2}
                  value={faq.answer}
                  placeholder="Respuesta"
                  aria-label="Respuesta"
                  onChange={(e) =>
                    setFaqs((list) => list.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)))
                  }
                />
              </div>
            ))}
          </section>

          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() =>
              void save(
                { texts: { ...texts, faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()) } },
                'Actualizó los textos informativos y las preguntas frecuentes.',
              )
            }
          >
            <Save size={19} /> Guardar textos
          </button>
        </div>
      )}

      {tab === 'fondo' && (
        <div className="stack">
          <section className="card stack">
            <h2 className="card-title">Reglas del fondo solidario</h2>
            <TextInput label="Título mostrado" value={fund.title} onChange={(v) => setFund((f) => ({ ...f, title: v }))} />
            <Field label="Descripción">
              <textarea className="textarea" rows={3} value={fund.description} onChange={(e) => setFund((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Reglas" hint="Una regla por línea.">
              <textarea className="textarea" rows={5} value={fundRules} onChange={(e) => setFundRules(e.target.value)} />
            </Field>
            <Field label="Cantidades sugeridas" hint="Separadas por coma, sin puntos de miles. Ej. 50000, 100000, 200000">
              <input className="input" value={fundAmounts} onChange={(e) => setFundAmounts(e.target.value)} />
            </Field>
            <div className="grid grid--2">
              <Field label="Aportación mínima">
                <MoneyInput value={fund.minDeposit} onChange={(v) => setFund((f) => ({ ...f, minDeposit: v }))} />
              </Field>
              <Field label="Retiro mínimo">
                <MoneyInput value={fund.minWithdrawal} onChange={(v) => setFund((f) => ({ ...f, minWithdrawal: v }))} />
              </Field>
            </div>
            <Field label="Condiciones del fondo">
              <textarea className="textarea" rows={3} value={fund.conditions} onChange={(e) => setFund((f) => ({ ...f, conditions: e.target.value }))} />
            </Field>
            <div className="list" style={{ marginTop: '0.3rem' }}>
              <label className="list-row" style={{ cursor: 'pointer' }}>
                <span className="list-row__body">
                  <span className="list-row__title">Fondo habilitado</span>
                  <span className="list-row__sub">Los usuarios pueden consultar y operar el fondo.</span>
                </span>
                <input
                  type="checkbox"
                  checked={fund.enabled}
                  onChange={(e) => setFund((f) => ({ ...f, enabled: e.target.checked }))}
                  style={{ width: '1.4rem', height: '1.4rem', accentColor: '#3b82f6' }}
                />
              </label>
              <label className="list-row" style={{ cursor: 'pointer' }}>
                <span className="list-row__body">
                  <span className="list-row__title">Permitir retiros</span>
                  <span className="list-row__sub">Los usuarios pueden retirar su saldo disponible.</span>
                </span>
                <input
                  type="checkbox"
                  checked={fund.allowWithdrawals}
                  onChange={(e) => setFund((f) => ({ ...f, allowWithdrawals: e.target.checked }))}
                  style={{ width: '1.4rem', height: '1.4rem', accentColor: '#3b82f6' }}
                />
              </label>
            </div>
          </section>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => {
              const rules = fundRules.split('\n').map((r) => r.trim()).filter(Boolean)
              const amounts = fundAmounts
                .split(',')
                .map((a) => parseAmount(a))
                .filter((a) => a > 0)
              void save(
                {
                  fund: { ...fund, rules, suggestedAmounts: amounts },
                  features: { ...features, fundEnabled: fund.enabled },
                },
                'Actualizó la configuración del fondo solidario.',
              )
            }}
          >
            <Save size={19} /> Guardar fondo
          </button>
        </div>
      )}

      {tab === 'seguros' && (
        <div className="stack">
          <section className="card stack">
            <h2 className="card-title">Reglas de seguros y pagos</h2>
            <div className="list">
              <label className="list-row" style={{ cursor: 'pointer' }}>
                <span className="list-row__body">
                  <span className="list-row__title">Permitir compra de seguros</span>
                  <span className="list-row__sub">Los usuarios pueden adquirir pólizas desde el catálogo.</span>
                </span>
                <input
                  type="checkbox"
                  checked={insurance.allowPurchase}
                  onChange={(e) => setInsurance((i) => ({ ...i, allowPurchase: e.target.checked }))}
                  style={{ width: '1.5rem', height: '1.5rem', accentColor: '#3b82f6' }}
                />
              </label>
            </div>
            <SelectInput
              label="Periodicidad predeterminada"
              value={insurance.defaultPeriodicity}
              onChange={(v) => setInsurance((i) => ({ ...i, defaultPeriodicity: v as Periodicity }))}
              options={[
                { value: 'monthly', label: 'Mensual' },
                { value: 'biweekly', label: 'Quincenal' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'annual', label: 'Anual' },
              ]}
              hint="Se preselecciona al comprar un seguro que tenga esa modalidad."
            />
            <Field label="Días de recordatorio" hint="Antelación de los avisos de cuota próxima a vencer.">
              <input
                className="input"
                type="number"
                min={1}
                value={insurance.reminderDays}
                onChange={(e) => setInsurance((i) => ({ ...i, reminderDays: Number(e.target.value) }))}
              />
            </Field>
            <div className="banner">
              <CircleAlert size={17} style={{ flexShrink: 0 }} />
              <span>Los cambios aplican a nuevas operaciones. Las pólizas existentes conservan sus condiciones.</span>
            </div>
          </section>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => void save({ insurance }, 'Actualizó las reglas de seguros y pagos.')}
          >
            <Save size={19} /> Guardar reglas
          </button>
        </div>
      )}

      {tab === 'funciones' && (
        <div className="stack">
          <section className="card">
            <h2 className="card-title" style={{ marginBottom: '0.6rem' }}>
              Funcionalidades de la aplicación
            </h2>
            <div className="list">
              {[
                { key: 'fundEnabled' as const, label: 'Fondo solidario', sub: 'Permite aportaciones y retiros.' },
                { key: 'catalogEnabled' as const, label: 'Catálogo de seguros', sub: 'Muestra los seguros disponibles.' },
                { key: 'paymentsEnabled' as const, label: 'Pagos de cuotas', sub: 'Habilita el registro de pagos simulados.' },
                { key: 'registrationEnabled' as const, label: 'Registro de usuarios', sub: 'Permite crear cuentas nuevas desde la app.' },
                { key: 'notificationsEnabled' as const, label: 'Notificaciones', sub: 'Genera recordatorios y avisos.' },
              ].map((item) => (
                <label key={item.key} className="list-row" style={{ cursor: 'pointer' }}>
                  <span className="list-row__body">
                    <span className="list-row__title">{item.label}</span>
                    <span className="list-row__sub">{item.sub}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={features[item.key]}
                    onChange={(e) => setFeatures((f) => ({ ...f, [item.key]: e.target.checked }))}
                    style={{ width: '1.5rem', height: '1.5rem', accentColor: '#3b82f6' }}
                  />
                </label>
              ))}
            </div>
          </section>
          <section className="card stack">
            <h2 className="card-title">Preferencia visual</h2>
            <SelectInput
              label="Tamaño de texto predeterminado"
              value={appearance.textScale}
              onChange={(v) => setAppearance({ textScale: v as AppSettings['appearance']['textScale'] })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Grande' },
                { value: 'xlarge', label: 'Muy grande' },
              ]}
              hint="Cada usuario puede ajustarlo desde Mi perfil."
            />
          </section>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => void save({ features, appearance }, 'Actualizó las funcionalidades y preferencias visuales.')}
          >
            <Save size={19} /> Guardar funcionalidades
          </button>
        </div>
      )}

      {tab === 'mensajes' && (
        <div className="stack">
          <section className="card stack">
            <h2 className="card-title">Plantillas de notificación</h2>
            {(
              [
                ['welcome', 'Bienvenida'],
                ['paymentReceived', 'Pago recibido'],
                ['deposit', 'Aportación al fondo'],
                ['withdrawal', 'Retiro del fondo'],
                ['announcement', 'Aviso general'],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <textarea
                  className="textarea"
                  rows={2}
                  value={messages.templates[key]}
                  onChange={(e) =>
                    setMessages((m) => ({ ...m, templates: { ...m.templates, [key]: e.target.value } }))
                  }
                />
              </Field>
            ))}
          </section>
          <section className="card stack">
            <h2 className="card-title">Aviso destacado</h2>
            <TextInput
              label="Título"
              value={messages.announcementTitle}
              onChange={(v) => setMessages((m) => ({ ...m, announcementTitle: v }))}
            />
            <Field label="Mensaje">
              <textarea
                className="textarea"
                rows={3}
                value={messages.announcementBody}
                onChange={(e) => setMessages((m) => ({ ...m, announcementBody: e.target.value }))}
              />
            </Field>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={messages.announcementActive}
                onChange={(e) => setMessages((m) => ({ ...m, announcementActive: e.target.checked }))}
              />
              <span>Mostrar este aviso a todos los usuarios al iniciar sesión.</span>
            </label>
            <div className="banner">
              <CircleAlert size={17} style={{ flexShrink: 0 }} />
              <span>Para enviar una notificación inmediata, usa la sección Avisos del panel.</span>
            </div>
          </section>
          <button
            type="button"
            className="btn btn--primary"
            disabled={saving}
            onClick={() => void save({ notifications: messages }, 'Actualizó las plantillas y los avisos de notificación.')}
          >
            <Save size={19} /> Guardar mensajes
          </button>
        </div>
      )}

      {tab === 'demo' && (
        <div className="stack">
          <section className="card">
            <h2 className="card-title">Información de la demostración</h2>
            <div className="summary-row">
              <span className="summary-row__label">Versión</span>
              <span className="summary-row__value">1.0.0</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Usuarios</span>
              <span className="summary-row__value">{state.users.length}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Pólizas</span>
              <span className="summary-row__value">{state.policies.length}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Movimientos contables</span>
              <span className="summary-row__value">{state.payments.length + state.fundMovements.length}</span>
            </div>
            <div className="summary-row">
              <span className="summary-row__label">Última actualización de configuración</span>
              <span className="summary-row__value">{new Date(settings.updatedAt).toLocaleString('es-CO')}</span>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Restablecer la demostración</h2>
            <p className="small muted" style={{ marginTop: '0.4rem', lineHeight: 1.5 }}>
              Vuelve a los datos iniciales: usuarios, pólizas, pagos, fondo y configuración. Se cerrará tu sesión.
            </p>
            <button
              type="button"
              className="btn btn--soft-danger btn--block"
              style={{ marginTop: '0.9rem' }}
              onClick={() => void resetDemo()}
              disabled={resetBusy}
            >
              {resetBusy ? <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> : <RotateCcw size={19} />}
              Restablecer datos demo
            </button>
          </section>

          <div className="banner banner--gold">
            <CircleAlert size={17} style={{ flexShrink: 0 }} />
            <span>
              Los datos se guardan en el almacenamiento local del dispositivo. Si desinstalas la aplicación, se
              perderán.
            </span>
          </div>
        </div>
      )}
    </>
  )
}
