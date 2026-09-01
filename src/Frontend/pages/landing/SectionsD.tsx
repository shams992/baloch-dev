import { Check, Heart, MessageCircle, PackageSearch, ShieldCheck, Star, Store, TrendingUp } from 'lucide-react'
import { Button, Reveal, SectionHeading } from '@/components/ui'
import { settings } from '@/lib/db'

/* ══ Benefits — buyers vs sellers ═══════════════════════════════ */
const BUYER_POINTS = [
  'Discover unique, one-of-a-kind products',
  'Find and follow independent creators',
  'Message sellers before you buy',
  'Place orders through a secure checkout',
  'Track purchases from studio to doorstep',
  'Leave reviews and help good craft rise',
]
const SELLER_POINTS = [
  'Create a free store in minutes',
  'Reach customers far beyond the bazaar',
  'Manage products, stock and pricing',
  'Process orders with live status tools',
  'Answer buyers with built-in messaging',
  'Track earnings and grow a real brand',
]

export function BenefitsSection() {
  return (
    <section className="relative py-24 sm:py-32" aria-labelledby="benefits">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          center
          eyebrow="Platform benefits"
          title={<>Built for both sides of <span className="text-gradient">every handshake</span></>}
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="card group relative h-full overflow-hidden p-8">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-2xl transition group-hover:bg-brand/20" aria-hidden />
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand dark:text-gold">
                <Heart size={13} /> For buyers
              </span>
              <ul className="space-y-3.5">
                {BUYER_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[0.92rem]">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-brand dark:text-gold"><Check size={13} /></span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button to="/products" variant="primary" size="sm"><PackageSearch size={15} /> Browse the marketplace</Button>
                <Button to="/how-it-works" variant="ghost" size="sm">How buying works</Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="card group relative h-full overflow-hidden p-8">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-2xl transition group-hover:bg-gold/25" aria-hidden />
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold">
                <Store size={13} /> For sellers
              </span>
              <ul className="space-y-3.5">
                {SELLER_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[0.92rem]">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/15 text-gold"><Check size={13} /></span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button to="/register" variant="gold" size="sm"><Store size={15} /> Open a free store</Button>
                <Button to="/become-seller" variant="ghost" size="sm">Seller guide</Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ══ 8% commission — transparent business model ═════════════════ */
export function CommissionSection() {
  const rate = settings.get().commission_rate
  return (
    <section className="relative overflow-hidden border-y border-line bg-bg-soft py-24 sm:py-32" aria-labelledby="commission">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{ backgroundImage: 'url(/images/pattern-bg.jpg)', backgroundSize: '440px' }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeading
          center
          eyebrow="Transparent pricing"
          title={<>One simple fee: <span className="text-gradient">{rate}% when you sell</span></>}
          sub="No setup fees, no monthly fees, no listing fees. The platform earns only when sellers earn — and it's shown on every order."
        />

        <Reveal delay={0.15}>
          <div className="card mx-auto mt-12 max-w-2xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
              <div className="p-5">
                <p className="text-[0.68rem] font-bold uppercase tracking-widest text-faint">Product sale</p>
                <p className="mt-1.5 font-display text-2xl font-semibold tnum">$100</p>
              </div>
              <div className="p-5">
                <p className="text-[0.68rem] font-bold uppercase tracking-widest text-faint">Platform fee (8%)</p>
                <p className="mt-1.5 font-display text-2xl font-semibold text-crimson tnum">− $8</p>
              </div>
              <div className="p-5">
                <p className="text-[0.68rem] font-bold uppercase tracking-widest text-faint">Seller earnings</p>
                <p className="mt-1.5 font-display text-2xl font-semibold text-emerald-500 tnum">$92</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex h-11 overflow-hidden rounded-2xl text-[0.72rem] font-bold">
                <div className="grid flex-[92] place-items-center bg-emerald-500/85 text-white">Seller — 92%</div>
                <div className="grid flex-[8] place-items-center bg-crimson/85 text-white">8%</div>
              </div>
              <p className="mt-4 text-center text-[0.8rem] text-muted">
                The 8% commission funds secure checkout, buyer protection, delivery tooling and platform support —
                so creators never pay anything upfront.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.72rem] font-semibold uppercase tracking-wider text-faint">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand dark:text-gold" /> No hidden fees</span>
                <span className="inline-flex items-center gap-1.5"><TrendingUp size={13} className="text-brand dark:text-gold" /> Earnings shown per order</span>
                <span className="inline-flex items-center gap-1.5"><MessageCircle size={13} className="text-brand dark:text-gold" /> Payout questions welcome</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ══ Final CTA ══════════════════════════════════════════════════ */
export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36" aria-labelledby="final-cta">
      <div className="absolute inset-0 bg-[radial-gradient(800px_420px_at_50%_-10%,color-mix(in_oklab,var(--brand)_30%,transparent),transparent),radial-gradient(600px_400px_at_80%_110%,color-mix(in_oklab,var(--gold)_22%,transparent),transparent)]" aria-hidden />
      <svg className="absolute left-[6%] top-[18%] h-20 w-20 text-gold/40 animate-spin-slower" viewBox="0 0 64 64" aria-hidden>
        <rect x="16" y="16" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <rect x="16" y="16" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(45 32 32)" />
      </svg>
      <svg className="absolute bottom-[16%] right-[8%] h-14 w-14 text-brand/40 animate-floaty" viewBox="0 0 64 64" aria-hidden>
        <rect x="18" y="18" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(45 32 32)" />
      </svg>

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <SectionHeading
          center
          title={<>Ready to share your creativity <span className="text-gradient">with the world?</span></>}
          sub="Join the Balochi creators building their future online. Your first store is five minutes away — and it's free."
        />
        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button to="/register" variant="gold" size="lg" className="w-full sm:w-auto">Create Your Account</Button>
            <Button to="/how-it-works" variant="ghost" size="lg" className="w-full sm:w-auto">Learn How It Works</Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
