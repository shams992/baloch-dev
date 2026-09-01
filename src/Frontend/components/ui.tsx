import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  BookOpen, Brush, Camera, ChefHat, Feather, Gem, Hand, Lamp, Landmark, Leaf,
  Palette, PenTool, PencilRuler, Scroll, Shapes, Shirt, Sparkles, Star,
  UtensilsCrossed, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, initials } from '@/lib/util'

/* ── Brand mark ───────────────────────────────────────────────── */
export function Octagram({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <rect x="17" y="17" width="30" height="30" stroke="var(--gold)" strokeWidth="3" />
      <rect x="17" y="17" width="30" height="30" stroke="var(--brand)" strokeWidth="3" transform="rotate(45 32 32)" />
      <circle cx="32" cy="32" r="5" fill="var(--crimson)" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="Baloch Export Hub — home">
      <span className="relative grid place-items-center">
        <Octagram size={34} className="transition-transform duration-700 group-hover:rotate-90" />
      </span>
      {!compact && (
        <span className="flex flex-col">
          <span className="block font-display text-[1.05rem] font-semibold leading-none tracking-tight">
            Baloch <span className="text-gold">Export Hub</span>
          </span>
          <span className="mt-1.5 block text-[0.58rem] font-medium uppercase tracking-[0.28em] text-faint">
            Craft • Culture • Trade
          </span>
        </span>
      )}
    </Link>
  )
}

/* ── Buttons ──────────────────────────────────────────────────── */
type ButtonProps = {
  variant?: 'primary' | 'gold' | 'ghost' | 'outline-gold' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  to?: string
  href?: string
  className?: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  type?: 'button' | 'submit'
  disabled?: boolean
  newTab?: boolean
  ariaLabel?: string
}

const SIZES: Record<string, string> = {
  sm: 'px-4 py-2 text-[0.82rem]',
  md: 'px-6 py-3 text-[0.9rem]',
  lg: 'px-8 py-4 text-[1rem]',
}

export function Button({
  variant = 'primary', size = 'md', to, href, className, children, onClick, type = 'button', disabled, newTab, ariaLabel,
}: ButtonProps) {
  const cls = cn(
    'btn',
    variant === 'primary' && 'btn-primary',
    variant === 'gold' && 'btn-gold',
    variant === 'ghost' && 'btn-ghost',
    variant === 'outline-gold' && 'btn-outline-gold',
    variant === 'danger' && 'border border-rose-500/40 text-rose-500 hover:bg-rose-500/10',
    SIZES[size],
    disabled && 'pointer-events-none opacity-50',
    className,
  )
  if (to) return <Link to={to} className={cls} aria-label={ariaLabel} onClick={onClick}>{children}</Link>
  if (href)
    return (
      <a
        href={href} className={cls} aria-label={ariaLabel} onClick={onClick}
        {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    )
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  )
}

/* ── Scroll reveal wrapper ────────────────────────────────────── */
export function Reveal({
  children, delay = 0, y = 30, once = true, className, as = 'div',
}: {
  children: React.ReactNode; delay?: number; y?: number; once?: boolean; className?: string
  as?: 'div' | 'section' | 'span' | 'li'
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] as typeof motion.div
  return (
    <MotionTag
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-70px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

/* ── Section heading ──────────────────────────────────────────── */
export function SectionHeading({
  eyebrow, title, sub, center = false, light = false,
}: {
  eyebrow?: string; title: React.ReactNode; sub?: string; center?: boolean; light?: boolean
}) {
  return (
    <div className={cn('max-w-3xl', center && 'mx-auto text-center')}>
      {eyebrow && (
        <Reveal>
          <p className={cn(
            'mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em]',
            light ? 'border-white/25 text-gold' : 'border-line text-brand dark:text-gold',
          )}>
            <Sparkles size={13} aria-hidden /> {eyebrow}
          </p>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2 className={cn(
          'font-display text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.75rem]',
          light ? 'text-white' : 'text-fg',
        )}>
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.12}>
          <p className={cn('mt-4 text-[1.02rem] leading-relaxed', light ? 'text-white/70' : 'text-muted')}>{sub}</p>
        </Reveal>
      )}
    </div>
  )
}

/* ── Stars ────────────────────────────────────────────────────── */
export function StarRating({
  rating, count, size = 15, className, interactive, onChange,
}: {
  rating: number; count?: number; size?: number; className?: string
  interactive?: boolean; onChange?: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} role={interactive ? 'radiogroup' : undefined} aria-label={interactive ? 'Choose a rating' : `Rated ${rating} out of 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const val = interactive ? (hover || rating) >= i : rating >= i
          const half = !interactive && !val && rating >= i - 0.5
          return interactive ? (
            <button
              key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? 's' : ''}`}
              className="transition-transform hover:scale-125"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
              onClick={() => onChange?.(i)}
            >
              <Star size={size} className={(hover || rating) >= i ? 'fill-gold text-gold' : 'text-faint'} />
            </button>
          ) : (
            <Star key={i} size={size} aria-hidden
              className={val ? 'fill-gold text-gold' : half ? 'fill-gold/50 text-gold' : 'text-faint'} />
          )
        })}
      </span>
      {count !== undefined && <span className="text-xs text-muted tnum">({count})</span>}
    </span>
  )
}

/* ── Category iconography ─────────────────────────────────────── */
export function DochIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" stroke="currentColor" strokeWidth="1.8" />
      <rect x="6.5" y="6.5" width="11" height="11" stroke="currentColor" strokeWidth="1.8" transform="rotate(45 12 12)" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

const ICONS: Record<string, LucideIcon | typeof DochIcon> = {
  Palette, Camera, Feather, Doch: DochIcon, Brush, PencilRuler, PenTool, Shapes, Lamp, Scroll,
  Leaf, ChefHat, UtensilsCrossed, BookOpen, Shirt, Gem, Hand, Landmark,
}

export function CategoryIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Tag = ICONS[name] ?? Sparkles
  return <Tag size={size} className={className} />
}

/* ── Avatar ───────────────────────────────────────────────────── */
export function Avatar({ name, color, size = 38, className }: { name: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color ?? '#0d7d76'}, ${shade(color ?? '#0d7d76')})`, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
function shade(hex: string) {
  // darken a hex color for gradient depth
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, ((n >> 16) & 255) - 60), g = Math.max(0, ((n >> 8) & 255) - 40), b = Math.max(0, (n & 255) - 40)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/* ── Badge ────────────────────────────────────────────────────── */
export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'brand' | 'gold' | 'green' | 'red'; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold',
      tone === 'neutral' && 'border-line bg-surface-2 text-muted',
      tone === 'brand' && 'border-brand/30 bg-brand/10 text-brand',
      tone === 'gold' && 'border-gold/40 bg-gold/10 text-gold',
      tone === 'green' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      tone === 'red' && 'border-rose-500/30 bg-rose-500/10 text-rose-500',
      className,
    )}>
      {children}
    </span>
  )
}

/* ── Modal ────────────────────────────────────────────────────── */
export function Modal({
  open, onClose, title, children, wide = false,
}: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog" aria-modal="true" aria-label={title}
        >
          <motion.div
            className={cn('card relative my-8 w-full p-6 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              {title && <h3 className="font-display text-xl font-semibold">{title}</h3>}
              <button onClick={onClose} className="rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-fg" aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Empty state ──────────────────────────────────────────────── */
export function EmptyState({
  icon, title, sub, action,
}: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-gold">{icon}</div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {sub && <p className="mt-1.5 max-w-sm text-sm text-muted">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ── Form primitives ──────────────────────────────────────────── */
export function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8rem] font-semibold text-muted">
        {label} {required && <span className="text-crimson">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300',
        checked ? 'bg-brand' : 'bg-line',
      )}
    >
      <span className={cn(
        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300',
        checked ? 'left-[1.4rem]' : 'left-0.5',
      )} />
    </button>
  )
}

/* ── Page hero for inner (non-landing) pages ──────────────────── */
export function PageHero({
  eyebrow, title, sub, children,
}: { eyebrow: string; title: React.ReactNode; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-line bg-bg-soft">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{ backgroundImage: 'url(/images/pattern-bg.jpg)', backgroundSize: '520px', backgroundPosition: 'center' }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-28 sm:px-8 lg:pb-20">
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} />
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  )
}
