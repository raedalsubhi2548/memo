import { useEffect, useRef, useState } from 'react'

/** True once the element enters the viewport (and stays true). Reduced motion → true immediately. */
export function useInView(options = { rootMargin: '0px 0px -10% 0px' }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) { setInView(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, options)
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, inView]
}
