import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { cn } from '@/lib/util'
import { THEME_OPTIONS, useTheme, type AppTheme } from '@/lib/providers'

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const current = THEME_OPTIONS.find((o) => o.id === theme)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full text-muted transition hover:bg-surface-2 hover:text-fg',
          compact ? 'h-9 w-9 justify-center' : 'h-9 px-3',
        )}
        aria-label={`Theme: ${current?.label ?? 'Original'}. Change theme`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Palette size={16} />
        {!compact && <span className="hidden text-xs font-semibold sm:inline">{current?.label}</span>}
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Choose theme"
          className="card absolute right-0 top-11 z-[120] w-56 overflow-hidden p-1.5 shadow-2xl"
        >
          {THEME_OPTIONS.map((opt) => (
            <ThemeOption
              key={opt.id}
              id={opt.id}
              label={opt.label}
              hint={opt.hint}
              active={theme === opt.id}
              onSelect={() => { setTheme(opt.id); setOpen(false) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeOption({
  id, label, hint, active, onSelect,
}: {
  id: AppTheme; label: string; hint: string; active: boolean; onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
        active ? 'bg-gold/12' : 'hover:bg-surface-2',
      )}
    >
      <span className="flex h-7 w-7 overflow-hidden rounded-full ring-1 ring-line" aria-hidden>
        <span className="h-full w-1/3" style={{ background: swatch(id).a }} />
        <span className="h-full w-1/3" style={{ background: swatch(id).b }} />
        <span className="h-full w-1/3" style={{ background: swatch(id).c }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[0.68rem] text-faint">{hint}</span>
      </span>
      {active && <Check size={14} className="text-gold" />}
    </button>
  )
}

function swatch(id: AppTheme) {
  if (id === 'light') return { a: '#f4efe6', b: '#0b6e68', c: '#a6741c' }
  if (id === 'alternative') return { a: '#12141c', b: '#3d9b8f', c: '#c9924a' }
  return { a: '#0a0f14', b: '#17aa9d', c: '#e0b054' }
}
