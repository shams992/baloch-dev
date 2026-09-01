import { useMemo } from 'react'
import { cn } from '@/lib/util'

/** Smooth SVG area chart with gradient fill — no external chart lib needed. */
export function AreaChart({
  data, labels, height = 180, className, prefix = '', format,
}: {
  data: number[]; labels?: string[]; height?: number; className?: string; prefix?: string
  format?: (n: number) => string
}) {
  const W = 640
  const H = height
  const pad = { t: 14, r: 8, b: 22, l: 8 }
  const max = Math.max(...data, 1)
  const stepX = (W - pad.l - pad.r) / Math.max(data.length - 1, 1)
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)

  const { line, area } = useMemo(() => {
    const pts = data.map((v, i) => [pad.l + i * stepX, y(v)] as const)
    if (pts.length === 0) return { line: '', area: '' }
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      const mx = (x0 + x1) / 2
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`
    }
    const a = `${d} L ${pts[pts.length - 1][0]} ${H - pad.b} L ${pts[0][0]} ${H - pad.b} Z`
    return { line: d, area: a }
  }, [data.join(',')])

  const fmt = format ?? ((n: number) => `${prefix}${n.toLocaleString()}`)

  return (
    <figure className={cn('w-full', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--brand)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke="var(--line)" strokeDasharray="3 6" />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="url(#lineStroke)" strokeWidth="2.5" strokeLinecap="round" />
        {data.map((v, i) => (
          <g key={i}>
            <circle cx={pad.l + i * stepX} cy={y(v)} r="4" fill="var(--surface)" stroke="var(--gold)" strokeWidth="2" />
            <title>{`${labels?.[i] ?? i}: ${fmt(v)}`}</title>
          </g>
        ))}
      </svg>
      {labels && (
        <figcaption className="mt-1 flex justify-between px-1 text-[0.65rem] text-faint tnum">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </figcaption>
      )}
    </figure>
  )
}

/** Horizontal stat bars. */
export function BarList({ items }: { items: Array<{ label: string; value: number; hint?: string }> }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-[0.8rem]">
            <span className="font-medium">{i.label}</span>
            <span className="text-muted tnum">{i.hint ?? i.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-brand transition-all duration-700"
              style={{ width: `${Math.max(4, (i.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
