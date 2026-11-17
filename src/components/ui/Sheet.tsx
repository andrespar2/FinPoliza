import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  closable?: boolean
}

export function Sheet({ open, onClose, title, subtitle, children, footer, closable = true }: SheetProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) onClose()
    }
    window.addEventListener('keydown', onKey)
    bodyRef.current?.scrollTo({ top: 0 })
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, closable, onClose])

  if (!open) return null
  const root = document.getElementById('modal-root') ?? document.body

  return createPortal(
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closable) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title ?? 'Diálogo'}>
        <div className="sheet__grabber" />
        {(title || closable) && (
          <div className="sheet__head">
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <h2 className="sheet__title">{title}</h2>}
              {subtitle && <p className="sheet__subtitle">{subtitle}</p>}
            </div>
            {closable && (
              <button type="button" className="icon-btn icon-btn--plain" onClick={onClose} aria-label="Cerrar">
                <X size={22} />
              </button>
            )}
          </div>
        )}
        <div className="sheet__body" ref={bodyRef}>
          {children}
        </div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    root,
  )
}
