import { useEffect, useRef, useState } from 'react'

/**
 * One continuous wave (echoing the swoosh under the Raed logo) that winds down behind every section, tying the page into a
 * single picture. It grows as you scroll; nothing is pinned or hijacked.
 */
export default function Vine() {
  const box = useRef(null)
  const path = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = box.current?.parentElement; if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const p = path.current; if (!p || !size.h) return
    const len = p.getTotalLength()
    p.style.strokeDasharray = `${len}`
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { p.style.strokeDashoffset = '0'; return }
    let raf = 0
    const tick = () => {
      raf = 0
      const top = box.current.getBoundingClientRect().top
      const prog = Math.min(1, Math.max(0, (innerHeight * 0.75 - top) / size.h))
      p.style.strokeDashoffset = `${len * (1 - prog)}`
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    tick(); addEventListener('scroll', on, { passive: true })
    return () => { removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [size])

  const { w, h } = size
  let d = '', leaves = []
  if (w && h) {
    const step = Math.max(520, Math.min(900, w * 0.7))
    const amp = w * 0.36, cx = w / 2
    d = `M ${cx} 0`
    let y = 0, side = 1, n = 0
    while (y < h) {
      const y2 = Math.min(h, y + step)
      const x2 = cx + side * amp * (n % 2 ? 0.55 : 1)
      d += ` C ${cx + side * amp * 1.1} ${y + step * 0.3}, ${x2} ${y2 - step * 0.45}, ${x2 * 0.5 + cx * 0.5} ${y2}`
      leaves.push({ x: x2 * 0.5 + cx * 0.5, y: y2, r: side > 0 ? -35 : 215 })
      y = y2; side = -side; n++
    }
  }

  return (
    <div ref={box} className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden" style={{ height: h || 0 }} aria-hidden="true">
      {d && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="absolute inset-0">
          <path d={d} style={{ stroke: 'var(--p-green-900)' }} strokeOpacity=".035" strokeWidth="16" strokeLinecap="round" />
          <path ref={path} d={d} style={{ stroke: 'var(--p-green-900)' }} strokeOpacity=".16" strokeWidth="1.4" strokeLinecap="round" />
          {leaves.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r="4" style={{ fill: 'var(--p-green-900)' }} opacity=".22" />)}
        </svg>
      )}
    </div>
  )
}
