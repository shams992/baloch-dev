import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, LifeBuoy, Mail, MapPin, MessageSquare, Send, ShieldQuestion } from 'lucide-react'
import { Button, Field, PageHero, Reveal, SectionHeading } from '@/components/ui'
import { useAuth } from '@/lib/providers'
import { notifications, emailSubscribers, users } from '@/lib/db'
import { BenefitsSection, CommissionSection } from '@/pages/landing/SectionsD'
import { HowItWorks } from '@/pages/landing/SectionsB'
import { CommunicationSection, DeliverySection, TrustSection } from '@/pages/landing/SectionsC'
import { Mission, StatsStrip, WhatIs, WhoCanSell } from '@/pages/landing/SectionsA'

/* ── /about ───────────────────────────────────────────────────── */
export function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About the platform"
        title={<>A marketplace built for <span className="text-gradient">Balochi makers</span></>}
        sub="Baloch Export Hub exists for one reason: to make sure the extraordinary things made in Balochistan — embroidery, craft, art, food and words — can be seen, loved and bought by the whole world."
      />
      <WhatIs />
      <StatsStrip />
      <Mission />
    </>
  )
}

/* ── /how-it-works ────────────────────────────────────────────── */
export function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={<>Five steps from <span className="text-gradient">signup to first sale</span></>}
        sub="Buying is instant. Selling starts free from your buyer dashboard. Here is the whole journey — for both sides."
      />
      <HowItWorks />
      <BenefitsSection />
      <CommissionSection />
    </>
  )
}

/* ── /categories ──────────────────────────────────────────────── */
export function CategoriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Categories"
        title={<>Eighteen doors into <span className="text-gradient">Balochi creativity</span></>}
        sub="Every category below is a live marketplace — open one to browse its stores and products, or start selling in it with your free store."
      />
      <CategoriesIndex />
    </>
  )
}

import { categories as cats } from '@/lib/db'
import { CategoryIcon } from '@/components/ui'
function CategoriesIndex() {
  const all = cats.list()
  return (
    <section className="py-16">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {all.map((c, i) => (
          <Reveal key={c.id} delay={(i % 3) * 0.06}>
            <Link to={`/category/${c.slug}`} className="group card flex h-full flex-col p-6 transition-all duration-500 hover:-translate-y-1 hover:border-gold/50">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand/15 to-gold/15 text-brand transition group-hover:text-gold dark:text-gold">
                  <CategoryIcon name={c.icon} size={24} />
                </span>
                <h3 className="font-display text-lg font-semibold">{c.name}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{c.description}</p>
              <span className="mt-4 text-xs font-semibold text-gold opacity-0 transition group-hover:opacity-100">Browse {c.name} →</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ── /trust ───────────────────────────────────────────────────── */
export function TrustPage() {
  return (
    <>
      <PageHero
        eyebrow="Trust & safety"
        title={<>Safety is the <span className="text-gradient">whole design</span></>}
        sub="Policies and protections for every buyer and seller on Baloch Export Hub."
      />
      <TrustSection />
      <CommunicationSection />
    </>
  )
}

/* ── /delivery ────────────────────────────────────────────────── */
export function DeliveryPage() {
  return (
    <>
      <PageHero
        eyebrow="Delivery"
        title={<>From the workshop <span className="text-gradient">to your door</span></>}
        sub="How orders travel — and how you can watch every step."
      />
      <DeliverySection />
    </>
  )
}

/* ── /become-seller ───────────────────────────────────────────── */
export function BecomeSellerPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHero
        eyebrow="Become a seller"
        title={<>Turn your craft into a <span className="text-gradient">living</span></>}
        sub="Open a free store, list your products and reach buyers across Pakistan and beyond. Registration starts as a buyer account — open your store any time from your dashboard."
      >
        <div className="flex flex-wrap gap-3">
          {user ? (
            user.role === 'buyer' ? (
              <Button to="/dashboard/become-seller" variant="gold" size="lg">Open seller onboarding</Button>
            ) : (
              <Button to="/seller" variant="gold" size="lg">Go to Seller Studio</Button>
            )
          ) : (
            <>
              <Button to="/register" variant="gold" size="lg">Create Your Free Account</Button>
              <Button to="/login" variant="ghost" size="lg">I already have an account</Button>
            </>
          )}
        </div>
      </PageHero>
      <WhoCanSell />
      <HowItWorks />
      <CommissionSection />
    </>
  )
}

/* ── /contact ─────────────────────────────────────────────────── */
export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email and message.')
      return
    }
    const admins = users.list('admin')
    for (const a of admins) {
      notifications.push({
        user_id: a.id, type: 'system',
        title: `Contact form: ${form.subject || 'New message'}`,
        body: `${form.name} (${form.email}) — ${form.message.slice(0, 160)}`,
      })
    }
    setSent(true)
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Talk to <span className="text-gradient">a human</span></>}
        sub="Questions about selling, buying, delivery or anything else — we usually reply within one working day."
      />
      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            {[
              { icon: <Mail size={19} />, title: 'Email', text: 'support@balochexporthub.com' },
              { icon: <MessageSquare size={19} />, title: 'In-app messaging', text: 'Message any seller from a product page — or admins from your dashboard.' },
              { icon: <MapPin size={19} />, title: 'Based in', text: 'Quetta · Gwadar · Karachi, Pakistan' },
              { icon: <LifeBuoy size={19} />, title: 'Help center', text: <Link to="/help" className="text-brand hover:underline dark:text-gold">Browse help articles →</Link> },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 0.07}>
                <div className="card flex items-start gap-4 p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand dark:text-gold">{c.icon}</span>
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{c.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.15}>
            <form onSubmit={submit} className="card space-y-5 p-7" aria-label="Contact form">
              {sent ? (
                <div className="grid place-items-center py-10 text-center">
                  <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><CheckCircle2 size={30} /></span>
                  <h3 className="font-display text-xl font-semibold">Message received!</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted">Thank you, {form.name.split(' ')[0]} — the team will reply to {form.email} shortly.</p>
                  <Button variant="ghost" size="sm" className="mt-5" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }}>Send another</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Your name" required>
                      <input id="contact-name" name="name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </Field>
                    <Field label="Email" required>
                      <input id="contact-email" name="email" type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </Field>
                  </div>
                  <Field label="Subject">
                    <input id="contact-subject" name="subject" className="field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Selling, orders, delivery…" />
                  </Field>
                  <Field label="Message" required>
                    <textarea id="contact-message" name="message" rows={5} className="field resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                  </Field>
                  {error && <p className="text-sm text-rose-500">{error}</p>}
                  <Button type="submit" variant="primary" className="w-full"><Send size={16} /> Send message</Button>
                </>
              )}
            </form>
          </Reveal>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <SectionHeading
            center eyebrow="Before you write"
            title={<>Maybe your answer is <span className="text-gradient">one click away</span></>}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button to="/faq" variant="ghost" size="sm"><ShieldQuestion size={15} /> FAQ</Button>
            <Button to="/delivery" variant="ghost" size="sm">Delivery info</Button>
            <Button to="/trust" variant="ghost" size="sm">Trust & safety</Button>
            <Button to="/help" variant="ghost" size="sm">Help center</Button>
          </div>
        </div>
      </section>
    </>
  )
}

export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [msg, setMsg] = useState('')
  const run = async () => {
    if (!token) { setMsg('Missing unsubscribe token.'); return }
    try {
      await emailSubscribers.unsubscribe(token)
      setMsg('You are unsubscribed. You will not receive product announcement emails.')
    } catch (e: any) {
      setMsg(e?.message ?? 'Could not unsubscribe.')
    }
  }
  return (
    <div className="mx-auto max-w-lg px-5 pb-20 pt-28 text-center">
      <h1 className="font-display text-3xl font-semibold">Unsubscribe</h1>
      <p className="mt-3 text-sm text-muted">Stop product announcement emails from Baloch Export Hub.</p>
      <Button className="mt-6" variant="gold" onClick={run}>Unsubscribe</Button>
      {msg && <p className="mt-4 text-sm text-muted">{msg}</p>}
      <p className="mt-6"><Link to="/" className="text-sm text-brand hover:underline dark:text-gold">Back to home</Link></p>
    </div>
  )
}
