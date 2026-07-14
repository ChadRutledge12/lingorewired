'use client'
import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, X } from 'lucide-react'
import { masteryOf, MASTERY_LEVELS } from '@/lib/mastery'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SpeakButton from '@/components/SpeakButton'
import { LogoLink } from '@/components/Logo'
import { useVoiceGender } from '@/lib/useVoiceGender'

// Font sizes per mastery level: mastered words dominate the cloud, new words
// stay small — one glance shows the shape of what you actually know.
const SIZE_CLASSES = {
  1: 'text-sm',
  2: 'text-base',
  3: 'text-xl',
  4: 'text-3xl',
}

// A 4-pip "signal strength" meter conveying mastery by COUNT of filled pips,
// not hue — the cloud's word color alone isn't a safe signal (New=rose vs
// Mastered=emerald is exactly the pair red-green colorblindness confuses),
// and the previous hover-only `title` tooltip never fires on touch, which
// this phone-first app is mostly used on. `bg-current` ties pip color to
// the word's own text color so it still reads as one cohesive mark.
function MasteryPips({ level }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`inline-block size-1 rounded-full bg-current ${i <= level ? '' : 'opacity-20'}`} />
      ))}
    </span>
  )
}

// Deterministic shuffle keyed on the word itself, so the cloud has an
// organic mixed look but words don't jump around between visits/renders.
function cloudOrder(cards) {
  const hash = (s) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return h
  }
  return [...cards].sort((a, b) => hash(a.word + a.id) - hash(b.word + b.id))
}

function WordModal({ card, deckName, onClose }) {
  const { gender: voiceGender } = useVoiceGender()
  const mastery = masteryOf(card)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl bg-card ring-1 ring-foreground/10 shadow-xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 text-muted-foreground">
          <X className="size-4" />
        </Button>

        {deckName && <p className="text-[11px] text-muted-foreground mb-2">{deckName}</p>}
        <Badge variant="outline" className={`mb-4 ${mastery.badgeClass}`}>{mastery.label}</Badge>
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-2xl font-semibold text-foreground">{card.word}</span>
          <SpeakButton text={card.word} gender={voiceGender} />
        </div>
        <p className="text-sm text-muted-foreground italic mb-1">{card.part_of_speech}</p>
        <p className="text-lg text-foreground mb-4">{card.translation}</p>
        {card.example && (
          <div className="mb-1 flex items-start justify-center gap-1">
            <p className="text-sm text-foreground/80 italic">{card.example}</p>
            <SpeakButton text={card.example} gender={voiceGender} className="shrink-0 -mt-1" />
          </div>
        )}
        {card.example_translation && (
          <p className="text-sm text-muted-foreground italic mb-4">{card.example_translation}</p>
        )}

        <Button asChild className="w-full rounded-xl mt-2">
          <Link href={`/review/${card.deck_id}?cards=${card.id}`}>Practice this word</Link>
        </Button>
      </div>
    </div>
  )
}

export default function CloudClient({ cards, deckNames }) {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState(null) // mastery level or null = all

  const ordered = useMemo(() => cloudOrder(cards), [cards])

  const levelCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const c of cards) counts[masteryOf(c).level] += 1
    return counts
  }, [cards])

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl">
        <LogoLink className="mb-4" />
        <Link href="/decks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-3.5" /> Back to decks
        </Link>

        <h1 className="text-2xl font-semibold text-foreground mb-1">Your word cloud</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Every word you&apos;re learning, sized by how well you know it. Tap a word to see its card.
        </p>

        {/* Legend doubles as a filter — tap a level to isolate it. */}
        <div className="mb-6 flex flex-wrap gap-2">
          {MASTERY_LEVELS.map((m) => (
            <button
              key={m.level}
              type="button"
              onClick={() => setFilter(filter === m.level ? null : m.level)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === null || filter === m.level ? m.badgeClass : 'border-border bg-card text-muted-foreground opacity-50'
              }`}>
              <span className={`size-2 rounded-full ${m.dotClass}`} />
              {m.label} · {levelCounts[m.level]}
            </button>
          ))}
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-foreground font-medium mb-1">No words yet</p>
            <p className="text-sm text-muted-foreground mb-4">Save a vocabulary set and your cloud will grow as you learn.</p>
            <Button asChild className="rounded-xl">
              <Link href="/">Create a set</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-3 leading-none">
              {ordered.map((card) => {
                const mastery = masteryOf(card)
                const dimmed = filter !== null && mastery.level !== filter
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelected(card)}
                    title={`${card.translation} · ${mastery.label}`}
                    aria-label={`${card.word}, ${card.translation}, mastery: ${mastery.label}`}
                    className={`inline-flex items-center gap-1 ${SIZE_CLASSES[mastery.level]} ${mastery.textClass} font-semibold transition hover:underline decoration-dotted underline-offset-4 hover:opacity-100 ${
                      dimmed ? 'opacity-15' : 'opacity-90'
                    }`}>
                    {card.word}
                    <MasteryPips level={mastery.level} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <WordModal card={selected} deckName={deckNames[selected.deck_id]} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
