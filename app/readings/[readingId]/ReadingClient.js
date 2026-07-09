'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LogoLink } from '@/components/Logo'
import SpeakButton from '@/components/SpeakButton'
import { speak } from '@/lib/speech'
import { useVoiceGender } from '@/lib/useVoiceGender'

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Splits a Spanish sentence into plain text + interactive target-word spans,
// matching the exact surface forms the generator recorded. Longest surfaces
// first so "las cebollas" wins over "cebollas".
function segmentSentence(es, targets) {
  const surfaces = (targets || []).map((t) => t.surface).filter(Boolean)
  if (surfaces.length === 0) return [{ text: es }]

  const byLength = [...surfaces].sort((a, b) => b.length - a.length)
  const re = new RegExp(`(${byLength.map(escapeRegex).join('|')})`, 'gi')
  const glossOf = (piece) => targets.find((t) => t.surface && t.surface.toLowerCase() === piece.toLowerCase())?.gloss

  return es.split(re).filter((p) => p !== '').map((piece) => {
    const gloss = glossOf(piece)
    return gloss ? { text: piece, gloss } : { text: piece }
  })
}

function TargetWord({ text, gloss, voiceGender }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-foreground underline decoration-dotted decoration-primary/60 underline-offset-4 hover:text-primary">
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-xs px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{text}</p>
            <p className="text-sm text-muted-foreground">{gloss}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => speak(text, voiceGender)}
            aria-label={`Play ${text}`}
            className="shrink-0 text-muted-foreground hover:text-primary">
            <Volume2 className="size-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Sentence({ sentence, alwaysShowEn, voiceGender }) {
  const [revealed, setRevealed] = useState(false)
  const showEn = alwaysShowEn || revealed
  const segments = segmentSentence(sentence.es, sentence.targets)

  return (
    <div className="group">
      <p
        onClick={() => setRevealed((r) => !r)}
        className="cursor-pointer text-lg leading-relaxed text-foreground/90 transition-colors hover:text-foreground"
        title="Tap to reveal the translation">
        {segments.map((seg, i) =>
          seg.gloss
            ? <TargetWord key={i} text={seg.text} gloss={seg.gloss} voiceGender={voiceGender} />
            : <span key={i}>{seg.text}</span>
        )}
      </p>
      {showEn && (
        <p className="mt-1 text-sm italic text-muted-foreground">{sentence.en}</p>
      )}
    </div>
  )
}

export default function ReadingClient({ reading, deckName }) {
  const { gender: voiceGender } = useVoiceGender()
  const [mode, setMode] = useState('tap') // 'tap' = per-sentence on demand, 'always' = show all
  const sentences = reading.content?.sentences || []

  const fullText = sentences.map((s) => s.es).join(' ')

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <LogoLink className="mb-4" />
        <Link href={`/decks/${reading.deck_id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-3.5" /> Back to deck
        </Link>

        <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-6 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {deckName && <p className="text-[11px] text-muted-foreground mb-1">{deckName}</p>}
              <h1 className="text-2xl font-semibold text-foreground">{reading.title}</h1>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => speak(fullText, voiceGender)}
              aria-label="Read the whole story aloud"
              className="shrink-0 text-muted-foreground hover:text-primary">
              <Volume2 className="size-5" />
            </Button>
          </div>

          <Tabs value={mode} onValueChange={setMode} className="mb-6">
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="tap">Tap for translation</TabsTrigger>
              <TabsTrigger value="always">Show all English</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
            {sentences.map((s, i) => (
              <Sentence key={i} sentence={s} alwaysShowEn={mode === 'always'} voiceGender={voiceGender} />
            ))}
          </div>

          <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
            Bold words are from your deck — tap one for its meaning and audio. Tap any sentence to reveal its English.
          </p>
        </div>
      </div>
    </div>
  )
}
