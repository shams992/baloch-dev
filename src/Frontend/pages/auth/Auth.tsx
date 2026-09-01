import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Store, User, X } from 'lucide-react'
import { Button, Field, Logo, Octagram } from '@/components/ui'
import { auth } from '@/lib/db'
import { homeFor } from '@/components/layout/PublicLayout'
import type { Profile } from '@/lib/types'

/* Shared split-screen shell */
function AuthShell({ side, children, title, sub }: {
  side: 'login' | 'register'; children: React.ReactNode; title: string; sub: string
}) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* visual side */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/images/doch-closeup.jpg" alt="Traditional Balochi Doch embroidery" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#07100f]/85 via-[#0a1116]/60 to-[#0a1116]/90" aria-hidden />
        <div className="absolute inset-0 grid place-items-center p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md text-white"
          >
            <Octagram size={52} className="mb-8" />
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Every stitch, <span className="text-gradient">every story</span> deserves a storefront.
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              Join Balochi artisans, artists and food producers selling to buyers across the country and beyond —
              safely, freely, and in their own voice.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              {['Free accounts — buyers by default', 'Free stores — 8% only when you sell', 'Secure in-platform checkout & messaging'].map((t) => (
                <li key={t} className="flex items-center gap-3"><ShieldCheck size={16} className="text-gold" /> {t}</li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* form side */}
      <div className="flex min-h-screen min-w-0 flex-col px-4 py-6 sm:px-10 sm:py-8 lg:px-16">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><Logo /></div>
          <Link to="/" className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted transition hover:text-fg sm:text-sm">
            <X size={14} /> Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md min-w-0 flex-1 flex-col justify-center py-8 sm:py-12">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">{sub}</p>
            {children}
          </motion.div>
        </div>
        <p className="text-center text-xs text-faint">
          By continuing you agree to our{' '}
          <Link to="/terms" className="underline hover:text-fg">Terms</Link> and{' '}
          <Link to="/privacy" className="underline hover:text-fg">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}

/* ── /login ───────────────────────────────────────────────────── */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  const signIn = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await auth.signIn(email, password)
      if (!res.ok) {
        setError(res.error ?? 'Sign-in failed.')
        return
      }
      if (!res.user) {
        setError('Sign-in succeeded but profile could not be loaded. Please try again.')
        return
      }
      const target = location.state?.from && !['/login', '/register'].includes(location.state.from)
        ? location.state.from
        : homeFor(res.user.role)
      navigate(target, { replace: true })
    } catch (e: any) {
      console.error('Sign-in error:', e)
      setError(e?.message ?? 'An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell side="login" title="Welcome back" sub="Sign in to your buyer, seller or admin account.">
      <form onSubmit={signIn} className="mt-8 space-y-5" noValidate>
        <Field label="Email" required>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input id="login-email" name="email" type="email" className="field pl-10" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
        </Field>
        <Field label="Password" required>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input id="login-password" name="password" type={show ? 'text' : 'password'} className="field px-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-fg" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        {error && <p role="alert" className="break-words rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" size="lg" disabled={submitting}>
          {submitting ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        New to Baloch Export Hub?{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline dark:text-gold">Create a free account</Link>
      </p>
    </AuthShell>
  )
}

/* ── /register ────────────────────────────────────────────────── */
export function RegisterPage() {
  const [f, setF] = useState({ full_name: '', username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const pwValid = f.password.length >= 8
  const match = f.password === f.confirm

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!f.full_name.trim() || !f.username.trim()) return setError('Please enter your full name and a username.')
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(f.username.trim())) return setError('Username: 3–24 letters, numbers, dot, dash or underscore.')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError('Please enter a valid email address.')
    if (!pwValid) return setError('Password must be at least 8 characters.')
    if (!match) return setError('Passwords do not match.')
    setSubmitting(true)

    try {
      const res = await auth.signUp(f)
      if (!res.ok) return setError(res.error ?? 'Registration failed.')
      if (res.user) {
        navigate('/dashboard', { replace: true })
      } else {
        // Email confirmation pending — show a helpful state
        setError('')
        navigate('/login', { replace: true })
      }
    } catch (e: any) {
      console.error('Registration error:', e)
      setError(e?.message ?? 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell side="register" title="Create your free account" sub="Free forever. Starts as a buyer account — open your store any time.">
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <Field label="Full name" required>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input id="register-full-name" name="full_name" className="field pl-10" placeholder="e.g. Samina Baloch" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} autoComplete="name" required />
          </div>
        </Field>
        <Field label="Username" required hint="Your public handle — letters, numbers, - _ .">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">@</span>
            <input id="register-username" name="username" className="field pl-9" placeholder="samina.embroiders" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="username" required />
          </div>
        </Field>
        <Field label="Email" required>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input id="register-email" name="email" type="email" className="field pl-10" placeholder="you@example.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" required />
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Password" required hint="Minimum 8 characters">
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input id="register-password" name="password" type={show ? 'text' : 'password'} className="field pl-10 pr-9" placeholder="••••••••" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" required />
            </div>
          </Field>
          <Field label="Confirm password" required>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input id="register-confirm" name="confirm" type={show ? 'text' : 'password'} className={`field pl-10 pr-9 ${f.confirm && !match ? '!border-rose-500' : ''}`} placeholder="••••••••" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" required />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-fg" aria-label={show ? 'Hide passwords' : 'Show passwords'}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
        </div>
        {error && <p role="alert" className="break-words rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{error}</p>}
        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : <><Store size={17} /> Create my free account</>}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline dark:text-gold">Sign in</Link>
      </p>
    </AuthShell>
  )
}
