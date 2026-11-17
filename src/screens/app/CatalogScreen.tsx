import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BookOpen, ChevronRight, Sparkles } from 'lucide-react'
import { useAppState } from '../../hooks/useApp'
import { availableProducts } from '../../services/selectors'
import { formatMoney } from '../../lib/format'
import { EmptyState, ProductIcon, ScreenHeader } from '../../components/ui/common'

export function CatalogScreen() {
  const state = useAppState()
  const navigate = useNavigate()
  const [category, setCategory] = useState('Todos')

  const products = availableProducts(state)
  const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category)))]
  const filtered = products.filter((p) => category === 'Todos' || p.category === category)
  const featured = useMemo(() => products.filter((p) => p.featured), [products])

  return (
    <div className="page">
      <ScreenHeader
        back="/seguros"
        title="Catálogo de seguros"
        subtitle="Encuentra la protección ideal. Toca un seguro para ver todos los detalles."
      />

      <div className="segmented" style={{ marginBottom: '1rem' }}>
        <button type="button" className="segmented__item" onClick={() => navigate('/seguros')}>
          Mis seguros
        </button>
        <button type="button" className="segmented__item segmented__item--active">
          Catálogo
        </button>
      </div>

      {!state.settings.features.catalogEnabled ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="Catálogo no disponible"
          text="La compañía deshabilitó temporalmente la consulta del catálogo. Intenta más tarde."
        />
      ) : (
        <>
          <div className="chip-row" style={{ marginBottom: '1rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip chip--button ${category === cat ? 'chip--active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {category === 'Todos' && featured.length > 0 && (
            <section className="section" style={{ marginTop: 0 }}>
              <div className="section-head">
                <h2 className="section-title">Destacados para ti</h2>
                <span className="featured-ribbon">
                  <Sparkles size={12} /> Recomendados
                </span>
              </div>
              <div className="grid grid--auto">
                {featured.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="card card--interactive product-card"
                    onClick={() => navigate(`/catalogo/${product.id}`)}
                  >
                    <div className="product-card__head">
                      <ProductIcon name={product.icon} color={product.color} size={1.6} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="policy-card__name">{product.name}</div>
                        <div className="policy-card__meta">{product.category}</div>
                      </div>
                    </div>
                    <p className="small muted" style={{ lineHeight: 1.45 }}>
                      {product.shortDescription}
                    </p>
                    <div className="row row--between">
                      <div>
                        <div className="tiny">Desde</div>
                        <div className="product-card__price">{formatMoney(product.basePrice)}</div>
                      </div>
                      <span className="row" style={{ gap: '0.25rem', color: '#9ec5ff', fontSize: '0.85rem', fontWeight: 650 }}>
                        Ver más <ChevronRight size={16} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">{category === 'Todos' ? 'Todos los seguros' : category}</h2>
              <span className="tiny">{filtered.length} disponibles</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState title="No hay seguros en esta categoría" text="Selecciona otra categoría para continuar." />
            ) : (
              <div className="stack">
                {filtered.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="card card--interactive product-card"
                    onClick={() => navigate(`/catalogo/${product.id}`)}
                  >
                    <div className="product-card__head">
                      <ProductIcon name={product.icon} color={product.color} size={1.7} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="policy-card__name">{product.name}</div>
                        <div className="policy-card__meta">
                          {product.category} · {product.durationMonths} meses
                        </div>
                      </div>
                      {product.featured && (
                        <span className="featured-ribbon">
                          <BadgeCheck size={12} /> Destacado
                        </span>
                      )}
                    </div>
                    <p className="small muted" style={{ lineHeight: 1.5 }}>
                      {product.shortDescription}
                    </p>
                    <div className="row row--between" style={{ marginTop: '0.1rem' }}>
                      <div>
                        <div className="tiny">Precio total</div>
                        <div className="product-card__price">{formatMoney(product.basePrice)}</div>
                      </div>
                      <div className="row" style={{ gap: '0.3rem', color: '#9ec5ff', fontSize: '0.85rem', fontWeight: 650 }}>
                        Ver detalles <ArrowRight size={16} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="banner banner--gold" style={{ marginTop: '1.2rem' }}>
            <Sparkles size={18} style={{ flexShrink: 0 }} />
            <span>
              Todos los seguros de esta DEMO son simulados. Puedes contratarlos y pagar cuotas sin mover dinero real.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
