'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Volume2, GraduationCap, Loader2, Plus } from 'lucide-react'
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

function TargetWord({ text, gloss, cardId, voiceGender, onTap }) {
  return (
    <Popover onOpenChange={(open) => { if (open && cardId) onTap(cardId) }}>
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

function Sentence({ sentence, alwaysShowEn, voiceGender, onTapWord }) {
  const [revealed, setRevealed] = useState(false)
  const showEn = alwaysShowEn || revealed
  const segments = segmentSentence(sentence.es, sentence.targets)
  const cardIdOf = (surface) => (sentence.targets || []).find((t) => t.surface && t.surface.toLowerCase() === surface.toLowerCase())?.cardId

  return (
    <div className="group">
      <p
        onClick={() => setRevealed((r) => !r)}
        className="cursor-pointer text-lg leading-relaxed text-foreground/90 transition-colors hover:text-foreground"
        title="Tap to reveal the translation">
        {segments.map((seg, i) =>
          seg.gloss
            ? <TargetWord key={i} text={seg.text} gloss={seg.gloss} cardId={cardIdOf(seg.text)} voiceGender={voiceGender} onTap={onTapWord} />
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
  const router = useRouter()
  const { gender: voiceGender } = useVoiceGender()
  const [mode, setMode] = useState('tap') // 'tap' = per-sentence on demand, 'always' = show all
  const [tapped, setTapped] = useState(() => new Set())
  const [continuing, setContinuing] = useState(false)
  const [continueError, setContinueError] = useState('')
  const sentences = reading.content?.sentences || []

  const fullText = sentences.map((s) => s.es).join(' ')

  // Words looked up this session feed the review tie-in; if none were tapped,
  // offer the full set of words the story was built from.
  const sourceCardIds = reading.content?.sourceCardIds || []
  const tapWord = (cardId) => setTapped((prev) => (prev.has(cardId) ? prev : new Set(prev).add(cardId)))
  const reviewIds = tapped.size > 0 ? [...tapped] : sourceCardIds

  const continueStory = async () => {
    setContinuing(true)
    setContinueError('')
    try {
      const res = await fetch(`/api/decks/${reading.deck_id}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continueReadingId: reading.id, length: 'short' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to continue the story')
      router.refresh() // reload with the appended sentences
    } catch (err) {
      setContinueError(err.message || 'Failed to continue the story')
    } finally {
      setContinuing(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <LogoLink />
          <Link href={`/decks/${reading.deck_id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to deck
          </Link>
        </div>

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
              <Sentence key={i} sentence={s} alwaysShowEn={mode === 'always'} voiceGender={voiceGender} onTapWord={tapWord} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-5">
            <Button variant="outline" size="sm" onClick={continueStory} disabled={continuing} className="rounded-xl">
              {continuing ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {continuing ? 'Continuing the story...' : 'Continue the story'}
            </Button>
            {reviewIds.length > 0 && (
              <Button asChild size="sm" className="rounded-xl">
                <Link href={`/review/${reading.deck_id}?cards=${reviewIds.join(',')}`}>
                  <GraduationCap className="size-3.5" />
                  {tapped.size > 0 ? `Review the ${tapped.size} word${tapped.size === 1 ? '' : 's'} you looked up` : 'Review these words'}
                </Link>
              </Button>
            )}
          </div>
          {continueError && <p className="mt-2 text-sm text-red-500">{continueError}</p>}

          <p className="mt-4 text-xs text-muted-foreground">
            Bold words are from your deck — tap one for its meaning and audio. Tap any sentence to reveal its English.
          </p>
        </div>
      </div>
    </div>
  )
}
