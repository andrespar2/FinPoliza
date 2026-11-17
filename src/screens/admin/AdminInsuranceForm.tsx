import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircleAlert, Info, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { saveProduct, type ProductInput } from '../../services/insurances'
import { AdminHeader, NoPermission } from '../../components/admin/AdminUI'
import { Field, MoneyInput, TextInput } from '../../components/ui/forms'
import { ProductIcon } from '../../components/ui/common'
import { useToast } from '../../components/ui/Feedback'
import { hasPermission } from '../../services/store'
import { uid } from '../../lib/id'
import type { CoverageItem, PaymentModality, Periodicity } from '../../types'

const ICONS = ['HeartPulse', 'Stethoscope', 'ShieldCheck', 'House', 'Car', 'Flower2', 'GraduationCap', 'PawPrint', 'Briefcase']
const COLORS = ['#4F8BFF', '#34D399', '#F2C230', '#A78BFA', '#38BDF8', '#F472B6', '#FB923C', '#60A5FA']
const PERIODICITIES: { value: Periodicity; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'annual', label: 'Anual' },
  { value: 'single', label: 'Pago único' },
]

export function AdminInsuranceForm() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const { id } = useParams()
  const session = state.session!
  const product = state.products.find((p) => p.id === id)
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? '',
    category: product?.category ?? 'Vida',
    icon: product?.icon ?? 'ShieldCheck',
    color: product?.color ?? '#4F8BFF',
    shortDescription: product?.shortDescription ?? '',
    description: product?.description ?? '',
    benefits: product?.benefits ?? [],
    coverage: product?.coverage ?? [{ label: '', amount: 0, detail: '' }],
    conditions: product?.conditions ?? [],
    durationMonths: product?.durationMonths ?? 12,
    basePrice: product?.basePrice ?? 0,
    modalities: product?.modalities ?? [
      { id: uid('mod'), label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
    ],
    featured: product?.featured ?? false,
    active: product?.active ?? true,
  })
  const [benefitsText, setBenefitsText] = useState((product?.benefits ?? []).join('\n'))
  const [conditionsText, setConditionsText] = useState((product?.conditions ?? []).join('\n'))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!hasPermission(session, 'insurances.manage')) {
    return (
      <>
        <AdminHeader title={isEdit ? 'Editar seguro' : 'Nuevo seguro'} back="/admin/seguros" />
        <NoPermission permission="insurances.manage" />
      </>
    )
  }

  const updateModality = (index: number, patch: Partial<PaymentModality>) => {
    setForm((f) => ({
      ...f,
      modalities: f.modalities.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }))
  }

  const updateCoverage = (index: number, patch: Partial<CoverageItem>) => {
    setForm((f) => ({
      ...f,
      coverage: f.coverage.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }))
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const benefits = benefitsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const conditions = conditionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const coverage = form.coverage.filter((c) => c.label.trim() && c.amount > 0)
    setSaving(true)
    try {
      await saveProduct({ ...form, benefits, conditions, coverage }, isEdit ? id : undefined)
      toast.success(isEdit ? 'Seguro actualizado.' : 'Seguro creado correctamente.')
      navigate('/admin/seguros')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el seguro.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminHeader
        title={isEdit ? 'Editar seguro' : 'Nuevo seguro'}
        subtitle="Los cambios se reflejan en el catálogo de los usuarios."
        back="/admin/seguros"
      />

      <form className="stack" onSubmit={save}>
        {error && (
          <div className="form-error" role="alert">
            <CircleAlert size={18} style={{ flexShrink: 0 }} /> <span>{error}</span>
          </div>
        )}

        {isEdit && (
          <div className="banner banner--gold">
            <Info size={17} style={{ flexShrink: 0 }} />
            <span>
              Las pólizas ya contratadas conservan su snapshot original. Los cambios aplican a nuevas compras y al
              catálogo.
            </span>
          </div>
        )}

        <section className="card stack">
          <h2 className="card-title">Información general</h2>
          <TextInput label="Nombre del seguro" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <TextInput label="Categoría" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} hint="Ej. Vida, Salud, Hogar, Vehículo" />
          <Field label="Ícono representativo">
            <div className="chip-row">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`chip chip--button ${form.icon === icon ? 'chip--active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  aria-label={icon}
                >
                  <ProductIcon name={icon} color={form.color} size={1.1} />
                  {icon}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Color del seguro">
            <div className="chip-row">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  style={{
                    width: '2.3rem',
                    height: '2.3rem',
                    borderRadius: '999px',
                    background: color,
                    border: form.color === color ? '3px solid #fff' : '2px solid rgba(255,255,255,.2)',
                  }}
                />
              ))}
            </div>
          </Field>
          <Field label="Descripción corta" hint="Se muestra en el catálogo.">
            <textarea
              className="textarea"
              style={{ minHeight: '3.6rem' }}
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              maxLength={160}
            />
          </Field>
          <Field label="Descripción completa">
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
            />
          </Field>
          <div className="grid grid--2">
            <Field label="Precio total">
              <MoneyInput value={form.basePrice} onChange={(v) => setForm((f) => ({ ...f, basePrice: v }))} />
            </Field>
            <Field label="Duración (meses)">
              <input
                className="input"
                type="number"
                min={1}
                value={form.durationMonths}
                onChange={(e) => setForm((f) => ({ ...f, durationMonths: Number(e.target.value) }))}
              />
            </Field>
          </div>
          <div className="row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <span>Disponible en el catálogo</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              <span>Destacar en el catálogo</span>
            </label>
          </div>
        </section>

        <section className="card stack">
          <div className="row row--between">
            <h2 className="card-title">Modalidades de pago</h2>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  modalities: [
                    ...f.modalities,
                    { id: uid('mod'), label: 'Nueva modalidad', installments: 6, periodicity: 'monthly', surchargePct: 0 },
                  ],
                }))
              }
            >
              <Plus size={15} /> Agregar
            </button>
          </div>
          {form.modalities.map((modality, index) => (
            <div key={modality.id} className="card card--flat stack stack--sm" style={{ margin: 0 }}>
              <div className="row">
                <input
                  className="input"
                  value={modality.label}
                  onChange={(e) => updateModality(index, { label: e.target.value })}
                  aria-label="Nombre de la modalidad"
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Eliminar modalidad"
                  onClick={() =>
                    setForm((f) => ({ ...f, modalities: f.modalities.filter((_, i) => i !== index) }))
                  }
                  disabled={form.modalities.length === 1}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="grid grid--2">
                <Field label="Número de cuotas">
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={modality.installments}
                    onChange={(e) => updateModality(index, { installments: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Periodicidad">
                  <select
                    className="select"
                    value={modality.periodicity}
                    onChange={(e) => updateModality(index, { periodicity: e.target.value as Periodicity })}
                  >
                    {PERIODICITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Recargo o descuento (%)" hint="Usa un número negativo para descuento.">
                <input
                  className="input"
                  type="number"
                  value={modality.surchargePct}
                  onChange={(e) => updateModality(index, { surchargePct: Number(e.target.value) })}
                />
              </Field>
              <p className="tiny">
                Cuota estimada:{' '}
                <strong>
                  ${Math.round((form.basePrice * (1 + modality.surchargePct / 100)) / Math.max(1, modality.installments)).toLocaleString('es-CO')}
                </strong>
              </p>
            </div>
          ))}
        </section>

        <section className="card stack">
          <div className="row row--between">
            <h2 className="card-title">Coberturas</h2>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setForm((f) => ({ ...f, coverage: [...f.coverage, { label: '', amount: 0, detail: '' }] }))}
            >
              <Plus size={15} /> Agregar
            </button>
          </div>
          {form.coverage.map((coverage, index) => (
            <div key={index} className="card card--flat stack stack--sm" style={{ margin: 0 }}>
              <div className="row">
                <input
                  className="input"
                  value={coverage.label}
                  onChange={(e) => updateCoverage(index, { label: e.target.value })}
                  placeholder="Ej. Muerte accidental"
                  aria-label="Cobertura"
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Eliminar cobertura"
                  onClick={() => setForm((f) => ({ ...f, coverage: f.coverage.filter((_, i) => i !== index) }))}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <MoneyInput value={coverage.amount} onChange={(v) => updateCoverage(index, { amount: v })} />
              <input
                className="input"
                value={coverage.detail ?? ''}
                onChange={(e) => updateCoverage(index, { detail: e.target.value })}
                placeholder="Detalle (opcional)"
                aria-label="Detalle de la cobertura"
              />
            </div>
          ))}
        </section>

        <section className="card stack">
          <h2 className="card-title">Beneficios y condiciones</h2>
          <Field label="Beneficios" hint="Escribe un beneficio por línea.">
            <textarea className="textarea" rows={5} value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} />
          </Field>
          <Field label="Condiciones" hint="Escribe una condición por línea.">
            <textarea className="textarea" rows={5} value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} />
          </Field>
        </section>

        <div className="btn-row">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? (
              <>
                <LoaderCircle size={19} style={{ animation: 'spin 0.9s linear infinite' }} /> Guardando…
              </>
            ) : (
              <>
                <Save size={19} /> {isEdit ? 'Guardar cambios' : 'Crear seguro'}
              </>
            )}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/admin/seguros')}>
            Cancelar
          </button>
        </div>
      </form>
    </>
  )
}
