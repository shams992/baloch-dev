import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, MessageCircle, Package, ReviewIcon, Settings, Star, Store } from './icons'
import { notifications as notifApi } from '@/lib/db'
import { useAuth, useDb } from '@/lib/providers'
import { timeAgo, cn } from '@/lib/util'

const ICONS: Record<string, React.ReactNode> = {
  order: <Package size={15} />,
  message: <MessageCircle size={15} />,
  review: <Star size={15} />,
  store: <Store size={15} />,
  system: <Settings size={15} />,
  payout: <ReviewIcon size={15} />,
}

export function NotificationsBell() {
  const { user } = useAuth()
  useDb()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  if (!user) return null
  const list = notifApi.list(user.id)
  const unread = list.filter((n) => !n.read).length
  const [open, setOpen] = useClickOutside(ref)
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
        aria-label={`Notifications (${unread} unread)`} aria-expanded={open}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute right-0 top-0.5 h-2 w-2 animate-[pulse-dot_1.8s_ease-in-out_infinite] rounded-full bg-crimson" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="card absolute right-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <button onClick={() => notifApi.markAllRead(user.id)} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline dark:text-gold">
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[22rem] overflow-y-auto">
              {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>}
              {list.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    notifApi.markRead(n.id)
                    if (n.href) { setOpen(false); navigate(n.href) }
                  }}
                  className={cn('flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left transition hover:bg-surface-2', !n.read && 'bg-brand/5')}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand dark:text-gold">
                    {ICONS[n.type] ?? ICONS.system}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.82rem] font-semibold">{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{n.body}</span>
                    <span className="mt-1 block text-[0.68rem] text-faint">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
            <Link to="/dashboard/messages" className="block bg-surface-2 py-2.5 text-center text-xs font-semibold text-brand hover:underline dark:text-gold">
              Open messages
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useState } from 'react'
function useClickOutside(ref: React.RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref])
  return [open, setOpen] as const
}
