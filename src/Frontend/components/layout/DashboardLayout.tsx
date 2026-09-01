import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Bell, ChevronRight, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/util'
import { auth } from '@/lib/db'
import { useAuth } from '@/lib/providers'
import { Avatar, Logo } from '@/components/ui'
import { NotificationsBell } from '@/components/shared/NotificationsBell'
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher'

export interface DashNavItem {
  to: string
  label: string
  icon: React.ReactNode
  badge?: number
  end?: boolean
}

export function DashboardLayout({
  title, accent, items, homeTo, sidebarSlot,
}: { title: string; accent: string; items: DashNavItem[]; homeTo: string; sidebarSlot?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!user) return null
  const current = items.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))

  return (
    <div className="min-h-screen bg-bg">
      {/* sidebar */}
      <AnimatePresence>
        {open && (
          <motion.button
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)} aria-label="Close menu"
          />
        )}
      </AnimatePresence>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[95] flex w-[min(268px,86vw)] max-w-[268px] flex-col overflow-y-auto border-r border-line bg-surface transition-transform duration-300 lg:w-[268px] lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-line px-4 sm:px-5">
          <div className="min-w-0"><Logo /></div>
          <button className="rounded-lg p-1.5 text-muted hover:bg-surface-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-4 pt-5">
          <Link
            to={homeTo}
            className="group flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 transition hover:border-gold/40"
          >
            <Avatar name={user.full_name} color={user.avatar_color} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.full_name}</p>
              <p className={cn('text-[0.7rem] font-semibold uppercase tracking-wider', accent)}>{title}</p>
            </div>
            <ChevronRight size={15} className="ml-auto text-faint transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        {sidebarSlot}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6" aria-label={`${title} navigation`}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.86rem] font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-brand/15 to-transparent text-brand dark:text-gold shadow-[inset_2px_0_0_0_var(--brand)]'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1.5 text-[0.65rem] font-bold text-white tnum">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <Link to="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-fg">
            <ArrowLeft size={16} /> Back to site
          </Link>
          <button
            onClick={() => { auth.signOut(); window.location.assign('/') }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-500 transition hover:bg-rose-500/10"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* main column */}
      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-[80] flex h-16 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur-lg sm:gap-3 sm:px-7">
          <button className="shrink-0 rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={19} />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-tight sm:text-lg">
            {current?.label ?? title}
          </h1>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeSwitcher compact />
            <NotificationsBell />
          </div>
        </header>
        <main className="px-3 py-5 sm:px-7 sm:py-7 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
