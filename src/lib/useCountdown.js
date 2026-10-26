import { useEffect, useState } from 'react'

/** Seconds left before an action may run again (a new code: once a minute). start(n) begins a new wait. */
export function useCountdown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, (n = 60) => setLeft(n)]
}
export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
