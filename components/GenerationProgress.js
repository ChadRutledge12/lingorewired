'use client'
import { useEffect, useState } from 'react'

// AI generation has no real progress events, so this eases a bar toward ~90%
// over the expected duration and rotates reassuring status messages — enough
// to make a ~10s wait feel alive and roughly bounded. The bar never reaches
// 100% on its own; the parent unmounts it when the result arrives.
const STEPS = [
  'Choosing words for your world…',
  'Writing natural examples…',
  'Polishing the set…',
  'Almost there…',
]

export default function GenerationProgress({ message = 'Generating…', expectedMs = 12000 }) {
  const [pct, setPct] = useState(6)
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      // Asymptotic approach to 90% — fast at first, slowing as it nears the cap.
      const target = 90 * (1 - Math.exp(-elapsed / (expectedMs * 0.5)))
      setPct(Math.max(6, Math.min(92, target)))
      setStepIdx(Math.min(STEPS.length - 1, Math.floor(elapsed / (expectedMs / STEPS.length))))
    }, 150)
    return () => clearInterval(id)
  }, [expectedMs])

  return (
    <div className="w-full" role="status" aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {message} <span className="text-muted-foreground/70">{STEPS[stepIdx]}</span>
      </p>
    </div>
  )
}
