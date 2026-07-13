'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Volume2, Loader2, Lightbulb, Eye, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoLink } from '@/components/Logo'
import { speak } from '@/lib/speech'
import { useVoiceGender } from '@/lib/useVoiceGender'

// Self-assessment ratings → FSRS rating labels the /api/review route expects.
const RATINGS = [
  { key: 'again', label: 'Missed', classes: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' },
  { key: 'hard', label: 'Close', classes: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { key: 'good', label: 'Got it', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
]

function Landing({ deckId, deckName, onStart, loading, error }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-6 sm:p-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground mb-1">Translation practice</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Read an English sentence, say or type it in Spanish, then check yourself against a model answer — with the other valid ways to say it. Uses the words from <span className="font-medium text-foreground">{deckName}</span>.
      </p>
      <Button onClick={onStart} disabled={loading} className="rounded-xl">
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {loading ? 'Writing your sentences...' : 'Start practice'}
      </Button>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        <Link href={`/decks/${deckId}`} className="hover:text-foreground">← Back to deck</Link>
      </p>
    </div>
  )
}

function RevealBlock({ label, icon: Icon, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <Icon className="size-3.5" /> {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

function Sentence({ sentence, voiceGender, onRate }) {
  const [revealed, setRevealed] = useState(false)
  const { en, es, alternatives = [], note, grammarHint, scaffold = [] } = sentence

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Translate to Spanish</p>
      <p className="text-xl font-medium text-foreground mb-4">{en}</p>

      <div className="flex flex-wrap gap-4 mb-4">
        {grammarHint && (
          <RevealBlock label="Grammar hint" icon={Lightbulb}>
            <p className="text-sm text-foreground/80">{grammarHint}</p>
          </RevealBlock>
        )}
        {scaffold.length > 0 && (
          <RevealBlock label="Need a word?" icon={Eye}>
            <div className="flex flex-wrap gap-1.5">
              {scaffold.map((w, i) => (
                <span key={i} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{w.es}</span> — {w.en}
                </span>
              ))}
            </div>
          </RevealBlock>
        )}
      </div>

      {!revealed ? (
        <Button onClick={() => setRevealed(true)} className="w-full rounded-xl">
          <Eye className="size-4" /> Reveal answer
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-1">
              <p className="text-lg font-semibold text-foreground">{es}</p>
              <button
                type="button"
                onClick={() => speak(es, voiceGender)}
                aria-label="Play the answer"
                className="shrink-0 text-muted-foreground hover:text-primary">
                <Volume2 className="size-4" />
              </button>
            </div>
            {alternatives.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Also correct</p>
                <ul className="space-y-0.5">
                  {alternatives.map((a, i) => (
                    <li key={i} className="text-sm text-foreground/80">{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {note && <p className="mt-3 text-xs text-muted-foreground italic">{note}</p>}
          </div>

          <div>
            <p className="text-center text-xs text-muted-foreground mb-2">How did you do?</p>
            <div className="grid grid-cols-3 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onRate(r.key)}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition ${r.classes}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TranslateClient({ deckId, deckName }) {
  const { gender: voiceGender } = useVoiceGender()
  const [sentences, setSentences] = useState(null)
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/decks/${deckId}/translate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate practice')
      setSentences(data.sentences)
      setIndex(0)
    } catch (err) {
      setError(err.message || 'Failed to generate practice')
    } finally {
      setLoading(false)
    }
  }

  // A self-rating feeds FSRS for every batch word in the sentence.
  const rate = async (rating) => {
    const current = sentences[index]
    const cardIds = [...new Set((current.targets || []).map((t) => t.cardId).filter(Boolean))]
    // Fire-and-forget; a failed review write shouldn't block practice flow.
    for (const cardId of cardIds) {
      fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, rating }),
      }).catch(() => {})
    }
    setIndex((i) => i + 1)
  }

  const done = sentences && index >= sentences.length

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <LogoLink />
          <Link href={`/decks/${deckId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to deck
          </Link>
        </div>

        {!sentences ? (
          <Landing deckId={deckId} deckName={deckName} onStart={generate} loading={loading} error={error} />
        ) : done ? (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <Check className="mx-auto mb-2 size-10 text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Practice complete</h2>
            <p className="text-sm text-muted-foreground mb-6">You worked through {sentences.length} sentences. Your ratings fed back into your review schedule.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={generate} disabled={loading} className="rounded-xl">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                New set
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/decks/${deckId}`}>Back to deck</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-6 sm:p-8">
            <Sentence key={index} sentence={sentences[index]} voiceGender={voiceGender} onRate={rate} />
            <p className="mt-6 text-center text-xs text-muted-foreground">{index + 1} / {sentences.length}</p>
          </div>
        )}
      </div>
    </div>
  )
}
