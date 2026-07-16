'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { CALIBRATION_BANDS, estimateLevel } from '@/lib/calibrationWords'

// Chip styling mirrors the onboarding ChipGroup look (HomeClient's chipClasses)
// but as plain toggle buttons so this screen stays self-contained.
const chipBase = 'h-auto rounded-full border px-4 py-2 text-sm font-medium transition'
const chipOn = 'border-primary bg-primary text-primary-foreground'
const chipOff = 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'

function chipClass(selected) {
  return `${chipBase} ${selected ? chipOn : chipOff}`
}

// Placement screen: learner taps every word they already know, we estimate a
// level from that, then let them confirm or override it before generating.
export default function Calibration({ selfLevel, levelOptions, onComplete, onSkip }) {
  // Interleave the bands (round-robin) so difficulties are mixed rather than
  // presented easy→hard — it should read as a flat test, not a ranking the
  // learner can game. Deterministic (no random) so render stays pure.
  const words = useMemo(() => {
    const bands = CALIBRATION_BANDS.map((b) => b.words)
    const longest = Math.max(...bands.map((w) => w.length))
    const out = []
    for (let i = 0; i < longest; i++) {
      for (const band of bands) if (band[i]) out.push(band[i])
    }
    return out
  }, [])

  const [selected, setSelected] = useState(() => new Set())
  const [phase, setPhase] = useState('tap') // 'tap' | 'result'
  const [estimate, setEstimate] = useState(null)
  const [chosenLevel, setChosenLevel] = useState('')

  const toggle = (w) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(w) ? next.delete(w) : next.add(w)
      return next
    })
  }

  const seeLevel = () => {
    const est = estimateLevel([...selected])
    setEstimate(est)
    setChosenLevel(est.level)
    setPhase('result')
  }

  const finish = () => {
    onComplete({ level: chosenLevel, knownWords: [...selected] })
  }

  if (phase === 'result') {
    const adjusted = selfLevel && selfLevel !== estimate.level
    return (
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Quick placement</p>
        <h2 className="text-xl font-semibold mb-1 text-foreground">
          You look like <span className="text-primary">{estimate.level}</span>
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Based on the {selected.size} word{selected.size === 1 ? '' : 's'} you recognised.
          {adjusted ? ` You'd said "${selfLevel}" — we've nudged it to match.` : ''} Your set
          will be pitched here — tweak it if this feels off.
        </p>

        <div className="mb-8 flex w-full flex-wrap gap-2">
          {levelOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setChosenLevel(opt)}
              className={chipClass(chosenLevel === opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        <Button onClick={finish} disabled={!chosenLevel} className="w-full h-12 rounded-xl text-base">
          Generate my words →
        </Button>
        <button
          type="button"
          onClick={() => setPhase('tap')}
          className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to the words
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Quick placement</p>
      <h2 className="text-xl font-semibold mb-1 text-foreground">Tap every word you already know</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Takes about 30 seconds — it lets us pitch your set at the right level and skip what you
        already have. No pressure; only tap the ones you&apos;re sure of.
      </p>

      <div className="mb-8 flex w-full flex-wrap gap-2">
        {words.map((w) => (
          <button key={w} type="button" onClick={() => toggle(w)} className={chipClass(selected.has(w))}>
            {w}
          </button>
        ))}
      </div>

      <Button onClick={seeLevel} className="w-full h-12 rounded-xl text-base">
        See my level →
      </Button>
      <button
        type="button"
        onClick={onSkip}
        className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Skip for now
      </button>
    </div>
  )
}
