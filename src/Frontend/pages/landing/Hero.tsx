import { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Search, Sparkles, Store, Compass } from 'lucide-react'
import { Button } from '@/components/ui'
import { useInView } from '@/lib/hooks'

const HeroScene = lazy(() => import('@/three/HeroScene'))

const POPULAR = ['Balochi Doch', 'Sajji kit', 'Silver jewelry', 'Calligraphy', 'Juniper tea']

export function Hero() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  // mount the canvas once it first appears; pause the render loop off-screen
  const { ref, inView } = useInView<HTMLDivElement>(false, '-4% 0px')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { if (inView) setMounted(true) }, [inView])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/products')
  }

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center overflow-hidden pt-16" aria-label="Welcome">
      {/* backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(1100px_520px_at_75%_-10%,color-mix(in_oklab,var(--brand)_26%,transparent),transparent),radial-gradient(900px_500px_at_12%_112%,color-mix(in_oklab,var(--gold)_18%,transparent),transparent)]" aria-hidden />
      <div className="absolute inset-0 -z-0 opacity-90">
        {!reduce && mounted && (
          <Suspense fallback={null}>
            <HeroScene active={inView} />
          </Suspense>
        )}
        {reduce && (
          // reduced-motion fallback: static decorative motifs
          <div className="absolute inset-0" aria-hidden>
            <svg className="absolute left-[8%] top-[22%] text-gold/50 animate-spin-slower" width="90" height="90" viewBox="0 0 64 64"><rect x="18" y="18" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" /><rect x="18" y="18" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(45 32 32)" /></svg>
            <svg className="absolute right-[10%] top-[30%] text-brand/50" width="70" height="70" viewBox="0 0 64 64"><rect x="18" y="18" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" /><rect x="18" y="18" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" transform="rotate(45 32 32)" /></svg>
          </div>
        )}
      </div>
      {/* readability vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_420px_at_50%_45%,transparent,var(--bg)_78%)] opacity-70 dark:opacity-60" aria-hidden />

      <div className="relative mx-auto w-full max-w-5xl px-5 py-20 text-center sm:px-8">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-gold backdrop-blur sm:px-4 sm:text-[0.72rem] sm:tracking-[0.2em]"
        >
          <Sparkles size={13} aria-hidden /> The Balochi creators’ marketplace
        </motion.p>

        <h1 className="font-display text-[2rem] font-semibold leading-[1.06] tracking-tight sm:text-[2.6rem] md:text-6xl lg:text-[4.4rem]">
          {['Connecting', 'Balochi', 'Creativity', 'With', 'the', 'World'].map((word, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, y: 42, rotateX: -40 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.85, delay: 0.12 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}&nbsp;
            </motion.span>
          ))}
          <motion.span
            className="inline-block text-gradient"
            initial={reduce ? false : { opacity: 0, y: 42 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            — One Store at a Time.
          </motion.span>
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          className="mx-auto mt-6 max-w-2xl text-[1.02rem] leading-relaxed text-muted sm:text-lg"
        >
          Baloch Export Hub gives Balochi creators, artisans and traditional businesses a place to build a free
          online store, showcase their craft and reach buyers everywhere — while keeping purchases, messages and
          payments safe inside the platform.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.88 }}
          className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
        >
          <Button to="/register" variant="gold" size="lg" className="w-full sm:w-auto">
            <Store size={18} /> Create Your Free Store
          </Button>
          <Button to="/how-it-works" variant="ghost" size="lg" className="w-full sm:w-auto backdrop-blur">
            Discover How It Works <ArrowRight size={17} />
          </Button>
        </motion.div>

        {/* search — takes you to the dedicated marketplace search page */}
        <motion.form
          onSubmit={submit}
          initial={reduce ? false : { opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="glass mx-auto mt-12 max-w-2xl rounded-3xl p-2 shadow-[0_24px_70px_-30px_rgb(0_0_0/0.5)] transition-shadow focus-within:shadow-[0_24px_80px_-24px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
          role="search"
        >
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <Search size={19} className="ml-2 shrink-0 text-gold sm:ml-3" aria-hidden />
            <label htmlFor="hero-search" className="sr-only">Search the platform</label>
            <input
              id="hero-search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, categories or creators…"
              className="min-w-0 w-full bg-transparent py-3 text-[0.95rem] text-fg placeholder:text-faint focus:outline-none sm:py-3.5"
            />
            <button type="submit" className="btn btn-primary shrink-0 !rounded-2xl px-3 py-2.5 text-sm sm:px-5 sm:py-3">
              Search
            </button>
          </div>
        </motion.form>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-faint">Popular:</span>
          {POPULAR.map((p) => (
            <button
              key={p}
              onClick={() => navigate(`/search?q=${encodeURIComponent(p)}`)}
              className="rounded-full border border-line bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur transition hover:border-gold/50 hover:text-gold"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <motion.a
        href="#packing"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-faint transition hover:text-gold"
        animate={reduce ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="Scroll to explore"
      >
        <Compass size={20} className="mx-auto" />
        <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.25em]">Explore</span>
      </motion.a>
    </section>
  )
}
