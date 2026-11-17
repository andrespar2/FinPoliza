import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export function NotFoundScreen() {
  return (
    <div className="splash">
      <div className="empty__icon" style={{ background: 'rgba(59,130,246,.12)', color: '#9ec5ff' }}>
        <ShieldAlert size={28} />
      </div>
      <div>
        <h1 className="page-title" style={{ fontSize: '1.5rem' }}>
          Pantalla no encontrada
        </h1>
        <p className="muted" style={{ marginTop: '0.4rem' }}>
          La página que buscas no existe o cambió de lugar.
        </p>
      </div>
      <Link to="/" className="btn btn--primary">
        Volver al inicio
      </Link>
    </div>
  )
}
