import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Camera, ChefHat, Feather, Globe2, Handshake,
  Hammer, Landmark, MessagesSquare, Palette, PenTool, ShieldCheck, ShoppingBag, Sparkles, Store, Users,
} from 'lucide-react'
import { Badge, Button, DochIcon, Reveal, SectionHeading } from '@/components/ui'
import { stats } from '@/lib/db'
import { useCountUp, useInView } from '@/lib/hooks'
import { gsap } from '@/lib/gsap'

/* ══ What is this platform? ═════════════════════════════════════ */
export function WhatIs() {
  return (
    <section className="relative py-24 sm:py-32" aria-labelledby="what-is">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionHeading
            eyebrow="What is this platform?"
            title={<>A digital home for <span className="text-gradient">Balochi craft</span> — built to sell, not just showcase</>}
          />
          <Reveal delay={0.15}>
            <div className="mt-6 space-y-4 text-[0.98rem] leading-relaxed text-muted">
              <p>
                Baloch Export Hub is a <strong className="text-fg">multi-vendor marketplace</strong> created to connect
                Balochi creators — artisans, craftsmen, artists, writers, designers and traditional-product
                businesses — with customers in Pakistan and around the world.
              </p>
              <p>
                Members create a profile, open a free store, add their products, talk to buyers through built-in
                messaging and receive orders — all in one place. Buyers discover one-of-a-kind pieces, order
                securely and follow every step of delivery.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.25}>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                { icon: <Users size={16} />, text: 'Free buyer accounts' },
                { icon: <Store size={16} />, text: 'Free creator stores' },
                { icon: <MessagesSquare size={16} />, text: 'Built-in messaging' },
                { icon: <ShoppingBag size={16} />, text: 'In-platform checkout' },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand dark:text-gold">{f.icon}</span>
                  {f.text}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.35}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/about" variant="ghost">More about us <ArrowRight size={16} /></Button>
              <Button to="/categories" variant="gold">Browse 18 categories</Button>
            </div>
          </Reveal>
        </div>

        {/* image collage */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <Reveal>
            <div className="overflow-hidden rounded-[2rem] shadow-2xl">
              <img src="/images/hero-artisan.jpg" alt="A Balochi artisan hand-embroidering a traditional Doch pattern" className="aspect-[4/5] w-full object-cover" loading="lazy" />
            </div>
          </Reveal>
          <Reveal delay={0.2} className="absolute -bottom-8 -left-4 w-44 sm:-left-10 sm:w-56">
            <div className="overflow-hidden rounded-3xl border-4 border-[var(--bg)] shadow-2xl animate-floaty">
              <img src="/images/doch-closeup.jpg" alt="Close-up of vibrant Balochi Doch embroidery" className="aspect-square w-full object-cover" loading="lazy" />
            </div>
          </Reveal>
          <Reveal delay={0.3} className="absolute -top-5 -right-3 sm:-right-6">
            <div className="glass rounded-2xl px-5 py-4 shadow-xl">
              <p className="font-display text-2xl font-semibold text-gold tnum">18</p>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">Categories of craft</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ══ Animated statistics (live values from the database) ════════ */
export function StatsStrip() {
  const { ref, inView } = useInView<HTMLDivElement>()
  const s = stats.landing()
  const items = [
    { value: useCountUp(s.categories, inView), label: 'Categories', icon: <Sparkles size={18} /> },
    { value: useCountUp(s.creators, inView), label: 'Creator stores', icon: <Store size={18} /> },
    { value: useCountUp(s.products, inView), label: 'Products listed', icon: <ShoppingBag size={18} /> },
    { value: useCountUp(s.orders, inView), label: 'Orders placed', icon: <Package2 />, },
    { value: useCountUp(s.cities, inView), label: 'Cities & towns reached', icon: <Globe2 size={18} /> },
  ]
  return (
    <section ref={ref} className="relative border-y border-line bg-bg-soft py-14" aria-label="Platform statistics">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 sm:grid-cols-3 sm:px-8 lg:grid-cols-5">
        {items.map((it, i) => (
          <Reveal key={it.label} delay={i * 0.08} className="text-center">
            <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-gold/25 to-brand/25 text-gold">{it.icon}</span>
            <p className="font-display text-3xl font-semibold tnum sm:text-4xl">{it.value}</p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-faint sm:text-[0.72rem] sm:tracking-[0.16em]">{it.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
function Package2() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
}

/* ══ Mission with parallax imagery ══════════════════════════════ */
export function Mission() {
  const section = useRef<HTMLElement>(null)
  const img = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(img.current, { yPercent: -10 }, {
        yPercent: 10, ease: 'none',
        scrollTrigger: { trigger: section.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      })
    }, section)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={section} className="relative overflow-hidden py-24 sm:py-32" aria-labelledby="mission">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <div className="relative order-2 lg:order-1">
          <div className="relative h-[420px] overflow-hidden rounded-[2rem] shadow-2xl sm:h-[500px]">
            <img
              ref={img}
              src="/images/artisan-workshop.jpg"
              alt="A Balochi craftsman at work in his workshop"
              className="absolute inset-0 h-[124%] w-full -translate-y-[10%] object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />
          </div>
          <Reveal delay={0.2} className="absolute -bottom-6 right-4 sm:right-8">
            <div className="glass rounded-2xl px-5 py-4 shadow-xl">
              <p className="flex items-center gap-2 text-sm font-semibold"><Handshake size={16} className="text-gold" /> Fair for makers</p>
              <p className="mt-0.5 text-xs text-muted">Sellers keep 92% of every sale</p>
            </div>
          </Reveal>
        </div>

        <div className="order-1 lg:order-2">
          <SectionHeading
            eyebrow="Our mission"
            title={<>Taking Balochi creativity from local communities to the <span className="text-gradient">global marketplace</span></>}
          />
          <Reveal delay={0.15}>
            <p className="mt-5 text-[0.98rem] leading-relaxed text-muted">
              For generations, Balochi craft has lived in homes, workshops and bazaars — passed from mother to
              daughter, master to apprentice. Our mission is to carry that heritage onto the internet, where a
              Doch dress stitched in Quetta can find a home in Toronto, and a poet from Turbat can reach readers
              worldwide.
            </p>
          </Reveal>
          <div className="mt-7 space-y-3">
            {[
              { icon: <Users size={17} />, title: 'Support local creators', text: 'Tools, guidance and a storefront that costs nothing to open.' },
              { icon: <Landmark size={17} />, title: 'Preserve cultural heritage', text: 'Every listing documents a living tradition — motifs, materials, meaning.' },
              { icon: <ShieldCheck size={17} />, title: 'Help artisans earn online', text: 'A safe checkout, transparent fees and payouts for every sale.' },
              { icon: <Globe2 size={17} />, title: 'Connect creators with customers', text: 'Discovery, messaging and delivery — anywhere in the world.' },
            ].map((m, i) => (
              <Reveal key={m.title} delay={0.1 + i * 0.08}>
                <div className="flex gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-gold/40">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold/25 to-brand/25 text-gold">{m.icon}</span>
                  <div>
                    <p className="text-[0.92rem] font-semibold">{m.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{m.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ══ Who can use the platform ═══════════════════════════════════ */
const WHO = [
  { icon: <Palette size={22} />, title: 'Artists', text: 'Sell paintings, artwork and creative commissions to collectors everywhere.' },
  { icon: <Hammer size={22} />, title: 'Craftsmen', text: 'Sell handmade and traditional products made in your own workshop.' },
  { icon: <DochIcon size={22} />, title: 'Balochi Doch Makers', text: 'Showcase and sell traditional embroidery — dresses, dupattas, panels.' },
  { icon: <Feather size={22} />, title: 'Writers', text: 'Sell books, poetry collections and written works in any language.' },
  { icon: <Camera size={22} />, title: 'Photographers', text: 'Offer fine-art prints, postcards and photography experiences.' },
  { icon: <PenTool size={22} />, title: 'Designers', text: 'Sell design products, pattern packs and creative services.' },
  { icon: <ChefHat size={22} />, title: 'Food Producers', text: 'Offer traditional food, spice kits and family recipes where shipping allows.' },
  { icon: <Landmark size={22} />, title: 'Traditional Product Sellers', text: 'Sell cultural, heritage and handmade products of every kind.' },
]

export function WhoCanSell() {
  return (
    <section className="relative py-24 sm:py-32" aria-labelledby="who-can">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          center
          eyebrow="Who can use the platform?"
          title={<>If you make something rooted in Balochi culture, <span className="text-gradient">you belong here</span></>}
          sub="Eight kinds of creators are already building their stores. Registration is free and always starts as a buyer account — open your store whenever you're ready."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHO.map((w, i) => (
            <Reveal key={w.title} delay={(i % 4) * 0.08}>
              <Link
                to="/become-seller"
                className="group card relative flex h-full flex-col p-6 transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.4)]"
              >
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand/15 to-gold/15 text-brand transition-all duration-500 group-hover:from-gold/30 group-hover:to-brand/30 group-hover:text-gold dark:text-gold">
                  {w.icon}
                </span>
                <h3 className="font-display text-lg font-semibold">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{w.text}</p>
                <span className="mt-auto pt-4 text-xs font-semibold text-gold opacity-0 transition-all duration-300 group-hover:opacity-100">
                  Start your store →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
