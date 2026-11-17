import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const push = useCallback((kind: ToastKind, message: string) => {
    counter.current += 1
    const id = counter.current
    setToasts((current) => [...current.slice(-2), { id, kind, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, kind === 'error' ? 5000 : 3600)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`} role="status">
            <span className="toast__icon">
              {toast.kind === 'success' ? (
                <CheckCircle2 size={20} color="#2fe0a4" />
              ) : toast.kind === 'error' ? (
                <XCircle size={20} color="#ff6b6b" />
              ) : (
                <Info size={20} color="#60a5fa" />
              )}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Confirmaciones                                                      */
/* ------------------------------------------------------------------ */

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options &&
        createPortal(
          <div
            className="overlay overlay--top"
            role="presentation"
            onMouseDown={(e) => e.target === e.currentTarget && close(false)}
          >
            <div className="sheet" role="alertdialog" aria-modal="true" style={{ maxWidth: '26rem' }}>
              <div className="sheet__grabber" />
              <div className="sheet__body" style={{ paddingTop: '1.1rem' }}>
                <div
                  className="empty__icon"
                  style={{
                    background: options.danger ? 'rgba(255,107,107,.12)' : 'rgba(59,130,246,.12)',
                    color: options.danger ? '#ff9a9a' : '#9ec5ff',
                    margin: '0 auto 0.9rem',
                  }}
                >
                  <AlertTriangle size={26} />
                </div>
                <h2 className="sheet__title" style={{ textAlign: 'center' }}>
                  {options.title}
                </h2>
                <p className="small muted" style={{ textAlign: 'center', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  {options.message}
                </p>
              </div>
              <div className="sheet__foot" style={{ flexDirection: 'row' }}>
                <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={() => close(false)}>
                  {options.cancelLabel ?? 'Cancelar'}
                </button>
                <button
                  type="button"
                  className={`btn ${options.danger ? 'btn--danger' : 'btn--primary'}`}
                  style={{ flex: 1 }}
                  onClick={() => close(true)}
                >
                  {options.confirmLabel ?? 'Confirmar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmContextValue['confirm'] {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  return ctx.confirm
}
