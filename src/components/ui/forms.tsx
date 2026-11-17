import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { formatAmountInput } from '../../lib/format'

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  action,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  htmlFor?: string
  action?: ReactNode
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        <span>{label}</span>
        {action}
      </label>
      {children}
      {error ? (
        <span className="field__hint" style={{ color: '#ff9a9a' }}>
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  )
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  id,
  ...rest
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  id?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="input-group">
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        className="input-group__action"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  )
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  id,
  autoFocus,
}: {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  id?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => (value ? String(value) : ''))

  const display = focused ? text : value ? formatAmountInput(value) : ''

  return (
    <div className="input-prefix">
      <span className="input-prefix__symbol">$</span>
      <input
        id={id}
        className="input amount-input"
        inputMode="numeric"
        value={display}
        autoFocus={autoFocus}
        onFocus={() => {
          setFocused(true)
          setText(value ? String(value) : '')
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
          setText(digits)
          onChange(digits ? Number(digits) : 0)
        }}
        placeholder={placeholder}
        aria-label="Valor en pesos"
      />
    </div>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  rows = 4,
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  rows?: number
  placeholder?: string
  maxLength?: number
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        className="textarea"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </Field>
  )
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  hint,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  autoComplete,
  inputMode,
  required,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  type?: string
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal'
  required?: boolean
  disabled?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        disabled={disabled}
      />
    </Field>
  )
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="list-row" style={{ cursor: 'pointer' }}>
      <span className="list-row__body">
        <span className="list-row__title">{label}</span>
        {description && <span className="list-row__sub">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '1.5rem', height: '1.5rem', accentColor: '#3b82f6', flexShrink: 0 }}
      />
    </label>
  )
}

export { TextArea as TextareaInput }
