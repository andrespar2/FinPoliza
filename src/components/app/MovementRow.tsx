import { ChevronRight, Clock3 } from 'lucide-react'
import type { MovementView } from '../../types'
import { formatDate, formatMoney } from '../../lib/format'
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react'

export function MovementRow({
  movement,
  onClick,
  showUser,
}: {
  movement: MovementView
  onClick?: () => void
  showUser?: boolean
}) {
  const isFund = movement.source === 'fund'
  const isIncoming = movement.sign > 0
  const Icon = isFund ? (isIncoming ? ArrowDownLeft : ArrowUpRight) : Receipt
  const tone = isFund ? (isIncoming ? 'in' : 'out') : 'out'
  const content = (
    <>
      <span className={`movement-icon movement-icon--${tone}`}>
        <Icon size={19} />
      </span>
      <span className="list-row__body">
        <span className="list-row__title">{movement.title}</span>
        <span className="list-row__sub">
          {formatDate(movement.date)} · {movement.time}
          {showUser ? ` · ${movement.userName}` : ''}
        </span>
      </span>
      <span style={{ textAlign: 'right' }}>
        <span
          className="list-row__value"
          style={{ color: isIncoming ? 'var(--green)' : 'var(--text)', display: 'block' }}
        >
          {isIncoming ? '+' : '-'}
          {formatMoney(movement.amount)}
        </span>
        <span className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
          <Clock3 size={11} /> {movement.status === 'cancelled' ? 'Anulado' : isFund ? 'Registrado' : 'Pagado'}
        </span>
      </span>
      {onClick && <ChevronRight size={18} className="chev" />}
    </>
  )
  if (onClick) {
    return (
      <button type="button" className="list-row" onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className="list-row">{content}</div>
}
