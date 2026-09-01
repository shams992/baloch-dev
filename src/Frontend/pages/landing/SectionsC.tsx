import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck, CheckCircle2, Eye, Lock, MessageCircle, Package, PackageCheck,
  PackageSearch, Receipt, ShieldCheck, Star, Truck, User, Warehouse,
} from 'lucide-react'
import { Button, Reveal, SectionHeading } from '@/components/ui'

/* ══ Create your free store — CTA ═══════════════════════════════ */
export function CreateStoreCTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-36" aria-labelledby="create-store">
      <img src="/images/doch-closeup.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060a0d]/88 via-[#0a1116]/80 to-[#060a0d]/92)" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(700px_400px_at_50%_20%,transparent,rgba(6,10,13,0.85))]" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <SectionHeading
          light center
          eyebrow="Create your free store"
          title={<>Your craft deserves a <span className="text-gradient">global audience</span></>}
          sub="Anyone eligible can open a store and begin showcasing their products today. Free to start — you only share 8% when you make a sale."
        />
        <Reveal delay={0.2}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button to="/register" variant="gold" size="lg" className="w-full sm:w-auto">Create Your Free Store</Button>
            <Button to="/become-seller" variant="outline-gold" size="lg" className="w-full backdrop-blur sm:w-auto">See what sellers get</Button>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[0.82rem] font-medium text-white/75">
            {['No setup fee', 'No monthly fee', '8% only on sales', 'Keep 92% of every order'].map((t) => (
              <li key={t} className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-gold" /> {t}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

/* ══ Trust & safety ═════════════════════════════════════════════ */
const TRUST = [
  { icon: <BadgeCheck size={22} />, title: 'Verified Sellers', text: 'Stores are reviewed before going live, and seller profiles carry real names, locations and ratings.' },
  { icon: <Lock size={22} />, title: 'Secure Checkout', text: 'All purchases happen inside the platform — never through outside links or unprotected transfers.' },
  { icon: <ShieldCheck size={22} />, title: 'Buyer Protection', text: 'Clear order, refund and delivery policies on every purchase, with the platform as your safety net.' },
  { icon: <MessageCircle size={22} />, title: 'Safe Communication', text: 'Built-in messaging keeps buyer–seller conversation on-platform, monitored and recoverable.' },
  { icon: <Receipt size={22} />, title: 'Transparent Pricing', text: 'Product prices, shipping fees and the 8% platform commission are always visible up front.' },
  { icon: <User size={22} />, title: 'Secure Accounts', text: 'Authenticated sessions, role-based access and protected personal data for every account.' },
]

export function TrustSection() {
  return (
    <section className="relative py-24 sm:py-32" aria-labelledby="trust">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Trust & safety"
            title={<>A marketplace you can <span className="text-gradient">trust with your craft</span></>}
            sub="Trust is our foundation. Every policy, feature and screen is designed to protect both sides of every order."
          />
          <Reveal delay={0.15}><Button to="/trust" variant="ghost">Full policy details</Button></Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 0.09}>
              <div className="group card h-full p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-[0_20px_50px_-22px_rgb(0_0_0/0.4)]">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-onbrand dark:text-gold dark:group-hover:bg-gold dark:group-hover:text-[#241a04]">
                  {t.icon}
                </span>
                <h3 className="font-display text-lg font-semibold">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══ Delivery pipeline ══════════════════════════════════════════ */
const PIPE = [
  { icon: <Warehouse size={20} />, label: 'Seller', sub: 'prepares the order' },
  { icon: <Package size={20} />, label: 'Packaging', sub: 'packed with care' },
  { icon: <Truck size={20} />, label: 'Shipping', sub: 'courier picks up' },
  { icon: <PackageSearch size={20} />, label: 'In transit', sub: 'tracked to your city' },
  { icon: <PackageCheck size={20} />, label: 'Buyer', sub: 'delivered & reviewed' },
]

export function DeliverySection() {
  return (
    <section className="relative border-y border-line bg-bg-soft py-24 sm:py-32" aria-labelledby="delivery">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          center
          eyebrow="Delivery"
          title={<>Follow every parcel, <span className="text-gradient">step by step</span></>}
          sub="Sellers prepare and pack orders, couriers carry them, and buyers watch live status from Pending to Delivered."
        />

        {/* animated pipeline */}
        <div className="relative mx-auto mt-16 max-w-4xl" role="img" aria-label="Delivery pipeline: seller to packaging to shipping to delivery to buyer">
          <div className="relative h-1.5 rounded-full bg-line">
            <div className="animate-travel absolute -top-[11px] z-10 grid h-6 w-6 place-items-center rounded-full bg-gold text-[#241a04] shadow-lg shadow-gold/40">
              <Package size={13} />
            </div>
          </div>
          <ol className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-5">
            {PIPE.map((p, i) => (
              <Reveal as="li" key={p.label} delay={i * 0.12} className="flex flex-col items-center text-center">
                <span
                  className="mb-3 grid h-14 w-14 place-items-center rounded-2xl border-2 border-line bg-surface text-brand dark:text-gold"
                  style={{ animation: `pulse-dot 5.5s ease-in-out ${(i * 5.5) / 5}s infinite` }}
                >
                  {p.icon}
                </span>
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="mt-0.5 text-[0.7rem] text-faint">{p.sub}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
          {[
            'Sellers confirm and prepare orders within 24 hours.',
            'Products are packaged by the makers themselves, with care instructions.',
            'Every shipment gets a tracking code once the courier collects it.',
            'Buyers see live status: Pending → Confirmed → Processing → Shipped → Delivered.',
          ].map((t, i) => (
            <Reveal key={t} delay={i * 0.08}>
              <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand dark:text-gold" /> {t}
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center">
          <Link to="/delivery" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline dark:text-gold">
            Read the full delivery story <Truck size={15} />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* ══ Communication ══════════════════════════════════════════════ */
export function CommunicationSection() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2600)
    return () => clearInterval(id)
  }, [])
  const chat = [
    { from: 'buyer', text: 'Salaam! Is the Doch dress available in teal thread?' },
    { from: 'seller', text: 'Wa alaikum salaam! Yes — teal silk is ready. Three weeks of stitching.' },
    { from: 'buyer', text: 'Perfect. Placing my order now 🧡' },
  ]
  const visible = chat.slice(0, (Math.floor(tick / 1) % 3) + 1)

  return (
    <section className="relative py-24 sm:py-32" aria-labelledby="communication">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionHeading
            eyebrow="Communication"
            title={<>Connect directly. <span className="text-gradient">Communicate safely.</span></>}
          />
          <Reveal delay={0.15}>
            <p className="mt-5 text-[0.98rem] leading-relaxed text-muted">
              Buyers and sellers talk through the platform’s built-in messaging — ask about sizes, request custom
              embroidery, agree on details, and keep every conversation tied to its product and order.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <p className="mt-4 text-[0.98rem] leading-relaxed text-muted">
              Sharing external contact information (phone numbers, personal links, off-platform payment requests) is
              restricted, so orders stay protected by buyer protection and every agreement stays on the record.
            </p>
          </Reveal>
          <div className="mt-7 space-y-3">
            {[
              { icon: <MessageCircle size={16} />, text: 'Conversations with read receipts and unread badges' },
              { icon: <Package size={16} />, text: 'Product & order context attached to each thread' },
              { icon: <Eye size={16} />, text: 'Monitored for safety; report anything suspicious to admins' },
            ].map((f, i) => (
              <Reveal key={f.text} delay={0.1 + i * 0.07}>
                <p className="flex items-center gap-3 text-sm font-medium">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand dark:text-gold">{f.icon}</span>
                  {f.text}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        {/* chat mockup */}
        <Reveal delay={0.15}>
          <div className="card mx-auto w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-crimson font-bold text-white">DG</span>
              <div>
                <p className="text-sm font-semibold">Doch e Gul</p>
                <p className="flex items-center gap-1.5 text-[0.7rem] text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Usually replies within an hour</p>
              </div>
              <Star size={16} className="ml-auto fill-gold text-gold" />
            </div>
            <div className="flex h-64 flex-col justify-end gap-2.5 bg-bg-soft/60 p-5">
              {visible.map((m, i) => (
                <div key={i} className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from === 'buyer' ? 'self-end rounded-br-md bg-brand text-onbrand' : 'self-start rounded-bl-md border border-line bg-surface'}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-3">
              <div className="flex items-center justify-between rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-faint">
                Type a message… <span className="text-gold">➤</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
