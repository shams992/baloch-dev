import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ArrowUpRight, ExternalLink, Mail, MapPin } from 'lucide-react'
import { emailSubscribers } from '@/lib/db'
import { Button, Octagram } from '@/components/ui'

const COLS: Array<{ title: string; links: Array<{ to?: string; href?: string; label: string }> }> = [
  {
    title: 'Platform',
    links: [
      { to: '/', label: 'Home' },
      { to: '/about', label: 'About' },
      { to: '/how-it-works', label: 'How It Works' },
      { to: '/categories', label: 'Categories' },
      { to: '/trust', label: 'Trust & Safety' },
      { to: '/delivery', label: 'Delivery' },
    ],
  },
  {
    title: 'Sellers',
    links: [
      { to: '/become-seller', label: 'Become a Seller' },
      { to: '/register', label: 'Create Store' },
      { to: '/seller-guide', label: 'Seller Guide' },
      { to: '/sellers', label: 'Browse Stores' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/faq', label: 'FAQ' },
      { to: '/contact', label: 'Contact' },
      { to: '/help', label: 'Help' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/terms', label: 'Terms' },
      { to: '/privacy', label: 'Privacy' },
      { to: '/refund-policy', label: 'Refund Policy' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/login', label: 'Login' },
      { to: '/register', label: 'Register' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-bg-soft">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'url(/images/pattern-bg.jpg)', backgroundSize: '480px' }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Baloch Export Hub — home">
              <Octagram size={34} />
              <span className="font-display text-lg font-semibold">Baloch Export Hub</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A multi-vendor marketplace taking Balochi creativity — embroidery, craft, art, food and words — from local
              communities to the global stage.
            </p>
            <div className="mt-5 space-y-2 text-sm text-muted">
              <p className="flex items-center gap-2"><MapPin size={15} className="text-gold" /> Quetta · Gwadar · Karachi</p>
              <a href="mailto:support@balochexporthub.com" className="flex items-center gap-2 transition hover:text-fg">
                <Mail size={15} className="text-gold" /> support@balochexporthub.com
              </a>
            </div>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-4 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-faint">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-sm text-muted transition hover:text-gold">
                        {l.label} <ExternalLink size={11} className="opacity-0 transition group-hover:opacity-100" />
                      </a>
                    ) : (
                      <Link to={l.to!} className="text-sm text-muted transition hover:text-gold">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <StayUpdated />

        <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-line pt-7 sm:flex-row">
          <p className="text-[0.8rem] text-faint">
            © {new Date().getFullYear()} Baloch Export Hub. All rights reserved.
          </p>
          <a
            href="https://balochdev.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-[0.82rem] font-semibold text-gold transition hover:bg-gold/20"
          >
            <span className="grid h-4 w-4 place-items-center">
              <span className="h-2 w-2 rotate-45 border border-gold transition group-hover:rotate-[135deg]" />
            </span>
            A BalochDev Project
            <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </footer>
  )
}

function StayUpdated() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await emailSubscribers.subscribe(email)
      setMsg('You’re subscribed. We only email new products — unsubscribe anytime.')
      setEmail('')
    } catch (err: any) {
      setMsg(err?.message ?? 'Could not subscribe.')
    }
  }
  return (
    <div className="mt-12 rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <h3 className="font-display text-xl font-semibold">Stay Updated</h3>
      <p className="mt-1 text-sm text-muted">Get an email when sellers add new live products. We never email unsubscribed addresses.</p>
      <form onSubmit={submit} className="mt-4 flex max-w-lg flex-col gap-3 sm:flex-row">
        <input className="field flex-1" type="email" required placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <Button type="submit" variant="gold">Subscribe</Button>
      </form>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  )
}
