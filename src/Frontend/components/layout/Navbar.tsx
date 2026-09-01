import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown, Heart, LayoutDashboard, LogOut, Menu, MessageCircle,
  Package, Settings, ShieldCheck, ShoppingBag, Store, User, X,
} from 'lucide-react'
import { cn } from '@/lib/util'
import { useAuth, useDb } from '@/lib/providers'
import { auth, cart, messaging, notifications } from '@/lib/db'
import { Avatar, Button, Logo } from '@/components/ui'
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/categories', label: 'Categories' },
  { to: '/trust', label: 'Trust & Safety' },
  { to: '/delivery', label: 'Delivery' },
  { to: '/become-seller', label: 'Become a Seller' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const { user } = useAuth()
  useDb() // live cart / message badges
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false); setMenu(false) }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const unreadNotifs = user ? notifications.unreadCount(user.id) : 0
  const unreadMsgs = user
    ? messaging.conversationsFor(user.id).reduce((sum, c) => sum + (user.id === c.buyer_id ? c.buyer_unread : c.seller_unread), 0)
    : 0
  const cartCount = user ? cart.count(user.id) : 0

  const dashboardTo = user?.role === 'admin' ? '/admin' : user?.role === 'seller' ? '/seller' : '/dashboard'

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[100] transition-all duration-500',
        scrolled
          ? 'glass shadow-[0_8px_40px_-16px_rgb(0_0_0/0.35)]'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="min-w-0 flex-1 xl:flex-none">
          <Logo />
        </div>

        <ul className="hidden items-center gap-0.5 xl:flex">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-full px-3 py-2 text-[0.8rem] font-medium transition-colors',
                    isActive ? 'text-gold' : 'text-muted hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      <motion.span layoutId="nav-dot" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-gold to-brand" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <span className="hidden min-[360px]:inline-flex"><ThemeSwitcher compact /></span>

          {user && (
            <>
              <Link to={dashboardTo + '/messages'} className="relative hidden h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg sm:grid" aria-label="Messages">
                <MessageCircle size={17} />
                {unreadMsgs > 0 && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-crimson" />}
              </Link>
              <Link to="/cart" className="relative grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg" aria-label="Shopping cart">
                <ShoppingBag size={17} />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.62rem] font-bold text-[#241a04] tnum">
                    {cartCount}
                  </span>
                )}
              </Link>
            </>
          )}

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-surface-2"
                aria-label="Account menu" aria-expanded={menu}
              >
                <Avatar name={user.full_name} color={user.avatar_color} size={32} />
                <ChevronDown size={14} className={cn('hidden text-muted transition-transform sm:block', menu && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="card absolute right-0 top-12 w-60 max-w-[calc(100vw-1rem)] overflow-hidden p-2 shadow-2xl"
                  >
                    <div className="border-b border-line px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{user.full_name}</p>
                      <p className="truncate text-xs text-faint">@{user.username} · {user.role}</p>
                    </div>
                    <MenuLink to={dashboardTo} icon={<LayoutDashboard size={15} />} label="Dashboard" badge={unreadNotifs ? String(unreadNotifs) : undefined} />
                    {user.role === 'seller' && <MenuLink to="/dashboard" icon={<ShoppingBag size={15} />} label="Buyer Dashboard" />}
                    {user.role !== 'buyer' && <MenuLink to="/seller" icon={<Store size={15} />} label="Seller Studio" />}
                    {user.role === 'admin' && <MenuLink to="/admin" icon={<ShieldCheck size={15} />} label="Admin Panel" />}
                    {user.role === 'admin' && <MenuLink to="/dashboard" icon={<ShoppingBag size={15} />} label="Buyer Dashboard" />}
                    <MenuLink to="/dashboard/wishlist" icon={<Heart size={15} />} label="Wishlist" />
                    <MenuLink to="/dashboard/orders" icon={<Package size={15} />} label="My Orders" />
                    <MenuLink to="/dashboard/settings" icon={<Settings size={15} />} label="Settings" />
                    <button
                      onClick={() => { auth.signOut(); window.location.assign('/') }}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-500 transition hover:bg-rose-500/10"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button to="/login" variant="ghost" size="sm">Login</Button>
              <Button to="/register" variant="gold" size="sm">
                <User size={15} /> Register
              </Button>
            </div>
          )}

          <button
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg xl:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="glass max-h-[min(80vh,calc(100dvh-4rem))] overflow-y-auto overflow-x-hidden border-t border-line/60 xl:hidden"
          >
            <ul className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              {LINKS.map((l, i) => (
                <motion.li key={l.to} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
                  <NavLink
                    to={l.to} end={l.to === '/'}
                    className={({ isActive }) => cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 text-[0.95rem] font-medium',
                      isActive ? 'bg-gold/10 text-gold' : 'text-fg hover:bg-surface-2',
                    )}
                  >
                    {l.label}
                    {l.to === '/become-seller' && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-gold">Free</span>}
                  </NavLink>
                </motion.li>
              ))}
              <motion.li initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * LINKS.length }}>
                <NavLink
                  to="/products"
                  className={({ isActive }) => cn(
                    'flex items-center rounded-xl px-4 py-3 text-[0.95rem] font-medium',
                    isActive ? 'bg-gold/10 text-gold' : 'text-fg hover:bg-surface-2',
                  )}
                >
                  Marketplace
                </NavLink>
              </motion.li>
              {user && (
                <li className="mt-2 space-y-0.5 border-t border-line/60 pt-2">
                  <NavLink to={dashboardTo} className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[0.95rem] font-medium text-fg hover:bg-surface-2">
                    <LayoutDashboard size={16} className="text-muted" /> Dashboard
                  </NavLink>
                  <NavLink to={`${dashboardTo}/messages`} className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[0.95rem] font-medium text-fg hover:bg-surface-2">
                    <MessageCircle size={16} className="text-muted" /> Messages
                    {unreadMsgs > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-crimson px-1.5 text-[0.65rem] font-bold text-white">{unreadMsgs}</span>}
                  </NavLink>
                  <NavLink to="/dashboard/orders" className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[0.95rem] font-medium text-fg hover:bg-surface-2">
                    <Package size={16} className="text-muted" /> My Orders
                  </NavLink>
                  <NavLink to="/dashboard/settings" className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[0.95rem] font-medium text-fg hover:bg-surface-2">
                    <Settings size={16} className="text-muted" /> Profile & settings
                  </NavLink>
                  <div className="flex items-center justify-between rounded-xl px-4 py-2 min-[360px]:hidden">
                    <span className="text-[0.95rem] font-medium">Theme</span>
                    <ThemeSwitcher compact />
                  </div>
                  <button
                    onClick={() => { auth.signOut(); window.location.assign('/') }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-[0.95rem] font-medium text-rose-500 hover:bg-rose-500/10"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </li>
              )}
              {!user && (
                <li className="mt-3 grid grid-cols-2 gap-2">
                  <Button to="/login" variant="ghost">Login</Button>
                  <Button to="/register" variant="gold">Register</Button>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function MenuLink({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <NavLink to={to} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg transition hover:bg-surface-2">
      <span className="text-muted">{icon}</span> {label}
      {badge && <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-crimson px-1 text-[0.6rem] font-bold text-white">{badge}</span>}
    </NavLink>
  )
}
