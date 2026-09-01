import { Suspense, lazy, useEffect, useState } from 'react'
import { Package, PackageCheck, PackageSearch, HandHeart } from 'lucide-react'
import { SectionHeading, Reveal } from '@/components/ui'
import { useInView, usePrefersReducedMotion } from '@/lib/hooks'

const PackingScene = lazy(() => import('@/three/PackingScene'))

const STEPS = [
  { icon: <HandHeart size={16} />, label: 'Made by hand' },
  { icon: <Package size={16} />, label: 'Packed with care' },
  { icon: <PackageSearch size={16} />, label: 'Tracked to you' },
  { icon: <PackageCheck size={16} />, label: 'Delivered safely' },
]

export function Packing() {
  const { ref, inView } = useInView<HTMLDivElement>(false, '-10% 0px')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { if (inView) setMounted(true) }, [inView])
  const reduce = usePrefersReducedMotion()

  return (
    <section id="packing" ref={ref} className="relative overflow-hidden py-24 sm:py-32" aria-label="How orders are packed">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          center
          eyebrow="The journey of an order"
          title={<>From artisan hands <span className="text-gradient">to your doorstep</span></>}
          sub="Every order is prepared by the maker, packed with care and tracked until it reaches you — a small ritual repeated for each parcel."
        />

        <Reveal delay={0.15} className="relative mx-auto mt-14 max-w-4xl">
          <div className="card relative h-[380px] overflow-hidden sm:h-[460px] lg:h-[520px]">
            <div className="absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_0%,color-mix(in_oklab,var(--gold)_14%,transparent),transparent),radial-gradient(560px_320px_at_50%_100%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent)]" aria-hidden />
            {!reduce && mounted && (
              <Suspense fallback={<PackingFallback />}>
                <PackingScene active={inView} />
              </Suspense>
            )}
            {(reduce || !mounted) && <PackingFallback />}
          </div>

          {/* overlay caption chips */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-wrap items-center justify-center gap-2 px-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.label} delay={0.25 + i * 0.12}>
                <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.72rem] font-semibold text-fg">
                  <span className="text-gold">{s.icon}</span> {s.label}
                </span>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-xl text-center text-sm text-faint">
            A live 3D loop rendered in your browser — one parcel, four handcrafted pieces, sealed with a golden band.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function PackingFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden>
      <svg width="120" height="120" viewBox="0 0 64 64" className="animate-floaty text-gold/70">
        <rect x="14" y="26" width="36" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M14 32h36" stroke="currentColor" strokeWidth="2.5" />
        <path d="M32 26v24" stroke="var(--gold)" strokeWidth="4" />
      </svg>
    </div>
  )
}
