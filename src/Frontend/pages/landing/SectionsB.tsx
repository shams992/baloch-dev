import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Box, CheckCircle2, CreditCard, MessagesSquare, PackagePlus, Store, UserPlus } from 'lucide-react'
import { CategoryIcon, Reveal, SectionHeading } from '@/components/ui'
import { categories, categories as cats } from '@/lib/db'
import { gsap } from '@/lib/gsap'

/* ══ Categories — marquee + full grid (all 18) ══════════════════ */
export function CategoriesSection() {
  const all = cats.list()
  const counts = categories.counts()
  const rowA = all.slice(0, 9)
  const rowB = all.slice(9)

  return (
    <section className="relative overflow-hidden py-24 sm:py-32" aria-labelledby="categories">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          center
          eyebrow="Categories"
          title={<>Eighteen doors into <span className="text-gradient">Balochi creativity</span></>}
          sub="From hand-stitched Doch to wild juniper tea, every category is a marketplace of its own — open one and start exploring."
        />
      </div>

      {/* marquee rows */}
      <div className="marquee-paused relative mt-14 space-y-4 overflow-hidden" aria-hidden>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--bg)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--bg)] to-transparent" />
        {[{ row: rowA, cls: 'animate-marquee' }, { row: rowB, cls: 'animate-marquee-rev' }].map(({ row, cls }, ri) => (
          <div key={ri} className="flex w-max gap-4" >
            <div className={`flex gap-4 ${cls}`}>
              {[...row, ...row].map((c, i) => (
                <Link
                  key={`${c.id}-${i}`}
                  to={`/category/${c.slug}`}
                  tabIndex={-1}
                  className="card group flex w-56 items-center gap-3.5 px-5 py-4 transition hover:border-gold/50"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/15 to-gold/15 text-brand transition group-hover:text-gold dark:text-gold">
                    <CategoryIcon name={c.icon} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block text-[0.7rem] text-faint tnum">{counts[c.slug] ?? 0} products</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* full grid */}
      <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {all.map((c, i) => (
          <Reveal key={c.id} delay={(i % 3) * 0.07}>
            <Link
              to={`/category/${c.slug}`}
              className="group card flex h-full items-center gap-4 overflow-hidden p-4 transition-all duration-500 hover:-translate-y-1 hover:border-gold/50"
            >
              <span className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-brand transition group-hover:text-gold dark:text-gold">
                {c.image ? (
                  <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" loading="lazy" />
                ) : (
                  <CategoryIcon name={c.icon} size={30} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] font-bold text-faint tnum">{counts[c.slug] ?? 0}</span>
                </span>
                <span className="mt-1 line-clamp-2 block text-[0.8rem] leading-relaxed text-muted">{c.description}</span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[0.72rem] font-semibold text-gold opacity-0 transition group-hover:opacity-100">
                  Open category <ArrowRight size={12} />
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Reveal>
          <Link to="/categories" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline dark:text-gold">
            See the categories explained <ArrowRight size={15} />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* ══ How it works — 5 steps with GSAP ScrollTrigger ═════════════ */
const STEPS = [
  {
    icon: <UserPlus size={20} />, title: 'Register', kicker: '2 minutes, free forever',
    text: 'Create your free account with a name, username and email. Every account starts as a buyer — you can browse and shop immediately.',
    chips: ['Full name', 'Username', 'Email', 'Password'],
  },
  {
    icon: <Store size={20} />, title: 'Create your store', kicker: 'From your buyer dashboard',
    text: 'When you’re ready to sell, open “Become a Seller” and choose your store name, description, category, logo and banner.',
    chips: ['Store name', 'Description', 'Category', 'Logo & banner'],
  },
  {
    icon: <PackagePlus size={20} />, title: 'Add products', kicker: 'List as much as you make',
    text: 'Upload images and describe each piece: name, description, price, stock, category and shipping information.',
    chips: ['Images', 'Price & stock', 'Category', 'Shipping info'],
  },
  {
    icon: <CreditCard size={20} />, title: 'Receive orders', kicker: 'Buyers order & pay in-platform',
    text: 'Buyers discover your work in the marketplace, message you with questions and place orders through secure checkout.',
    chips: ['Order alert', 'Secure payment', 'New order → confirm', 'Pack & ship'],
  },
  {
    icon: <Box size={20} />, title: 'Manage your store', kicker: 'One studio for everything',
    text: 'Run everything from Seller Studio: products, orders, customers, earnings (8% platform fee), reviews, messages and notifications.',
    chips: ['Products', 'Orders', 'Earnings', 'Messages & reviews'],
  },
]

export function HowItWorks() {
  const wrap = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const isMobile = window.innerWidth < 640
    const ctx = gsap.context(() => {
      gsap.fromTo(
        line.current,
        { scaleY: 0 },
        {
          scaleY: 1, ease: 'none', transformOrigin: 'top center',
          scrollTrigger: { trigger: wrap.current, start: 'top 70%', end: 'bottom 55%', scrub: 0.5 },
        },
      )
      gsap.utils.toArray<HTMLElement>('.hiw-step').forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          x: isMobile ? 0 : i % 2 === 0 ? -60 : 60,
          y: isMobile ? 40 : 0,
          duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 78%' },
        })
      })
    }, wrap)
    return () => ctx.revert()
  }, [])

  return (
    <section className="relative border-y border-line bg-bg-soft py-24 sm:py-32" aria-labelledby="how-it-works">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          center
          eyebrow="How it works"
          title={<>From signup to your first sale in <span className="text-gradient">five steps</span></>}
          sub="No storefront costs, no listing fees, no technical setup. Register, build, list, sell, manage."
        />

        <div ref={wrap} className="relative mx-auto mt-16 max-w-4xl">
          <div className="absolute bottom-8 left-[1.4rem] top-8 w-px bg-line sm:left-1/2" aria-hidden>
            <div ref={line} className="h-full w-full bg-gradient-to-b from-gold to-brand" />
          </div>

          <ol className="space-y-12">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`hiw-step relative grid gap-5 sm:grid-cols-2 sm:gap-10 ${i % 2 === 0 ? '' : 'sm:[direction:rtl]'}`}>
                <div className={`[direction:ltr] ${i % 2 === 0 ? 'sm:text-right' : 'sm:text-left'}`}>
                  <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-widest text-gold">
                    Step {i + 1}
                  </span>
                  <h3 className="flex items-center gap-2.5 font-display text-2xl font-semibold [justify-inherit]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-onbrand">{s.icon}</span>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-faint">{s.kicker}</p>
                  <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">{s.text}</p>
                  <div className="mt-4 flex flex-wrap gap-2 [justify-inherit]">
                    {s.chips.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[0.7rem] font-medium text-muted">
                        <CheckCircle2 size={11} className="text-brand dark:text-gold" /> {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:block" />
                <span className="absolute left-[1.4rem] top-1.5 z-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 border-gold bg-bg font-display text-[0.72rem] font-bold text-gold sm:left-1/2 tnum" aria-hidden>
                  {i + 1}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <Reveal className="mt-14 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn btn-gold px-8 py-3.5">Create Your Free Account</Link>
            <Link to="/become-seller" className="btn btn-ghost px-8 py-3.5">Guided seller tour <ArrowRight size={16} /></Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
