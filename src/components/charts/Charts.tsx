import { formatMoney } from '../../lib/format'

export interface SeriesDef {
  label: string
  color: string
}

export function BarChart({
  data,
  series,
  height = 170,
}: {
  data: { label: string; values: number[] }[]
  series: SeriesDef[]
  height?: number
}) {
  const width = 340
  const padding = { top: 12, right: 8, bottom: 26, left: 8 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(1, ...data.flatMap((d) => d.values))
  const groupWidth = innerW / Math.max(1, data.length)
  const barGap = 2
  const barWidth = Math.max(3, (groupWidth - 10) / series.length - barGap)
  const grid = [0, 0.5, 1]

  return (
    <div>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico de barras comparativo"
      >
        {grid.map((g) => (
          <line
            key={g}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * g}
            y2={padding.top + innerH * g}
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray={g === 1 ? undefined : '3 4'}
          />
        ))}
        {data.map((group, gi) => {
          const groupX = padding.left + gi * groupWidth
          const totalBarsWidth = series.length * barWidth + (series.length - 1) * barGap
          const startX = groupX + (groupWidth - totalBarsWidth) / 2
          return (
            <g key={group.label + gi}>
              {group.values.map((value, si) => {
                const h = Math.max(1, (value / max) * innerH)
                return (
                  <rect
                    key={si}
                    x={startX + si * (barWidth + barGap)}
                    y={padding.top + innerH - h}
                    width={barWidth}
                    height={h}
                    rx={Math.min(3, barWidth / 2)}
                    fill={series[si]?.color ?? '#3b82f6'}
                    opacity={0.92}
                  />
                )
              })}
              <text
                x={groupX + groupWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="9.5"
                fill="rgba(255,255,255,0.5)"
              >
                {group.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="chart-legend" style={{ marginTop: '0.35rem' }}>
        {series.map((s) => (
          <span key={s.label}>
            <span className="chart-legend__dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 150,
}: {
  segments: { label: string; value: number; color: string }[]
  centerLabel?: string
  centerValue?: string
  size?: number
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const active = segments.filter((s) => s.value > 0)

  return (
    <div className="row" style={{ gap: '1.2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Gráfico circular">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" />
        {active.map((segment) => {
          const fraction = segment.value / Math.max(1, total)
          const dash = circumference * fraction
          const el = (
            <circle
              key={segment.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="13"
              strokeDasharray={`${Math.max(0, dash - 2)} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          )
          offset += dash
          return el
        })}
        {centerValue && (
          <text x="60" y="58" textAnchor="middle" fontSize="15" fontWeight="700" fill="#f5f8fc">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x="60" y="73" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.5)">
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="stack stack--sm" style={{ flex: '1 1 9rem' }}>
        {segments.map((s) => (
          <div key={s.label} className="row row--between" style={{ gap: '0.5rem' }}>
            <span className="small muted row" style={{ gap: '0.45rem' }}>
              <span className="chart-legend__dot" style={{ background: s.color }} />
              {s.label}
            </span>
            <strong className="small money">{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MiniSparkline({
  values,
  color = '#2fe0a4',
  height = 42,
}: {
  values: number[]
  color?: string
  height?: number
}) {
  const width = 120
  const max = Math.max(1, ...values)
  const step = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((v, i) => `${i * step},${height - (v / max) * (height - 6) - 3}`).join(' ')
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function MoneyScale({ value, max }: { value: number; max: number }) {
  return (
    <div>
      <div className="row row--between" style={{ marginBottom: '0.3rem' }}>
        <span className="small strong">{formatMoney(value, { compact: true })}</span>
        <span className="tiny">de {formatMoney(max, { compact: true })}</span>
      </div>
      <div className="progress progress--thin progress--green">
        <div className="progress__bar" style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} />
      </div>
    </div>
  )
}
