import { useEffect, useRef, useState } from 'react'

/**
 * True when the element should be shown. It starts true (the pre-rendered page, reduced motion and a visitor who never
 * scrolls all see everything). Once the visitor starts scrolling, an element still below the screen is hidden and
 * rises back in as it enters the view.
 */
export function useInView(options = { rootMargin: '0px 0px -8% 0px' }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let io
    const arm = () => {
      removeEventListener('scroll', arm)
      if (el.getBoundingClientRect().top < innerHeight * 0.92) return // already on screen or passed: leave it
      setInView(false)
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, options)
      io.observe(el)
    }
    addEventListener('scroll', arm, { passive: true, once: true })
    return () => { removeEventListener('scroll', arm); io?.disconnect() }
  }, [])
  return [ref, inView]
}
