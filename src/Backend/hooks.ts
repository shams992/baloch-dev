import { useEffect, useRef, useState } from 'react'

/** True when the element has entered the viewport. */
export function useInView<T extends HTMLElement>(once = true, margin = '-60px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) setInView(false)
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once, margin])
  return { ref, inView }
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Animated count-up that starts when `active` becomes true. */
export function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setValue(Math.round(target * easeOutCubic(p)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return value
}

/** OS-level reduced-motion preference. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const h = () => setReduced(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return reduced
}

/** Media query hook (SSR-safe enough for this app). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = () => setMatches(mq.matches)
    h()
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return matches
}

/** Runs GSAP ScrollTrigger safely with cleanup. */
export function useGsap(fn: () => () => void) {
  useEffect(() => {
    const cleanup = fn()
    return cleanup
  }, [fn])
}
