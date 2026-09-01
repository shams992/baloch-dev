import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { cn } from '@/lib/util'
import { THEME_OPTIONS, useTheme, type AppTheme } from '@/lib/providers'
import { AnchoredOverlay } from '@/components/shared/AnchoredOverlay'

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listId = useId()

  const current = THEME_OPTIONS.find((o) => o.id === theme)

  useEffect(() => {
    if (!open) return
    const i = THEME_OPTIONS.findIndex((o) => o.id === theme)
    setActiveIndex(i >= 0 ? i : 0)
  }, [open, theme])

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const select = (id: AppTheme) => {
    setTheme(id)
    setOpen(false)
    btnRef.current?.focus()
  }

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const n = THEME_OPTIONS.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + n) % n)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(n - 1)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full text-muted transition hover:bg-surface-2 hover:text-fg',
          compact ? 'h-9 w-9 justify-center' : 'h-9 px-3',
        )}
        aria-label={`Theme: ${current?.label ?? 'Original'}. Change theme`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
      >
        <Palette size={16} />
        {!compact && <span className="hidden text-xs font-semibold sm:inline">{current?.label}</span>}
      </button>
      <AnchoredOverlay
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        id={listId}
        role="listbox"
        ariaLabel="Choose theme"
        width={224}
        className="p-1.5"
        onKeyDown={onListKeyDown}
      >
        {THEME_OPTIONS.map((opt, i) => (
          <ThemeOption
            key={opt.id}
            ref={(el) => { optionRefs.current[i] = el }}
            themeId={opt.id}
            label={opt.label}
            hint={opt.hint}
            active={theme === opt.id}
            highlighted={activeIndex === i}
            onSelect={() => select(opt.id)}
          />
        ))}
      </AnchoredOverlay>
    </>
  )
}

const ThemeOption = forwardRef<HTMLButtonElement, {
  themeId: AppTheme; label: string; hint: string; active: boolean; highlighted: boolean
  onSelect: () => void
}>(function ThemeOption({ themeId, label, hint, active, highlighted, onSelect }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={active}
      tabIndex={highlighted ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
        active ? 'bg-gold/12' : 'hover:bg-surface-2',
        highlighted && !active && 'bg-surface-2',
      )}
    >
      <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-line" aria-hidden>
        <span className="h-full w-1/3" style={{ background: swatch(themeId).a }} />
        <span className="h-full w-1/3" style={{ background: swatch(themeId).b }} />
        <span className="h-full w-1/3" style={{ background: swatch(themeId).c }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[0.68rem] text-faint">{hint}</span>
      </span>
      {active && <Check size={14} className="shrink-0 text-gold" />}
    </button>
  )
})

function swatch(id: AppTheme) {
  if (id === 'light') return { a: '#f4efe6', b: '#0b6e68', c: '#a6741c' }
  if (id === 'alternative') return { a: '#12141c', b: '#3d9b8f', c: '#c9924a' }
  return { a: '#0a0f14', b: '#17aa9d', c: '#e0b054' }
}
