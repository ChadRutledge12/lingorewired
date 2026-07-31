'use client'
import { useState } from 'react'
import { Loader2, Sparkles, X, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseWordList } from '@/lib/parseWordList'

// Matches MAX_WORDS in the enrich route. Checked here too so a 200-word paste
// fails instantly with a count the learner can act on, instead of after a round
// trip.
const MAX_WORDS = 60

const PLACEHOLDER = `el banco — bank
correr, to run
la reunión
to speak: hablar`

// Enough text to have vocabulary worth mining; mirrors MIN_CHARS in the
// extract route so the learner is told before a round trip.
const MIN_TEXT_CHARS = 40

const TEXT_PLACEHOLDER = `Paste a letter, an article, a message — anything real you need to understand.

Estimado cliente: le informamos de que su solicitud de empadronamiento ha sido tramitada. Deberá acudir a nuestras oficinas con el justificante adjunto…`

// Import vocabulary the learner already has.
//
// The learner brings the words; the AI fills in what's missing (translation,
// part of speech, an example sentence at their level) so an imported card is
// as complete as a generated one. Nothing is written until they press Add —
// this panel only ever holds drafts.
//
// The one thing we refuse to do silently is pick a meaning. "bank" is two
// unrelated Spanish words, and quietly choosing one is how an import teaches
// the wrong vocabulary for months. Those come back flagged and stay out of the
// count until the learner taps a meaning.
export default function ImportWordsPanel({ deckId, onAdded, onClose, initialMode = 'list' }) {
  // 'list' — the learner already has the words. 'text' — they have a document
  // and we work out which words are worth learning from it. Two ways in, one
  // review stage out.
  //
  // `initialMode` lets the deck-creation flow land straight on the tab the
  // learner already chose, instead of making them pick the same thing twice.
  const [mode, setMode] = useState(initialMode)
  const [text, setText] = useState('')
  const [passage, setPassage] = useState('')
  const [stage, setStage] = useState('input')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState([])
  const [failed, setFailed] = useState([])
  const [note, setNote] = useState('')
  // draft index → chosen sense index, or null while an ambiguous word is
  // waiting on the learner.
  const [picked, setPicked] = useState({})
  const [dropped, setDropped] = useState({})

  const parsed = parseWordList(text)
  const tooMany = parsed.length > MAX_WORDS
  const passageReady = passage.trim().length >= MIN_TEXT_CHARS

  // Both endpoints answer in the same shape, so one handler moves either into
  // the review stage.
  const receive = (data) => {
    const nextPicked = {}
    const nextDropped = {}
    ;(data.drafts || []).forEach((draft, i) => {
      // An unambiguous word needs no decision, so it arrives already chosen.
      nextPicked[i] = draft.ambiguous ? null : 0
      // A word already in the deck starts excluded rather than hidden — the
      // learner should see that their list overlapped, and can still add it
      // back if they meant to.
      if (!draft.ambiguous && draft.senses[0]?.duplicate) nextDropped[i] = true
    })
    setDrafts(data.drafts || [])
    setFailed(data.failed || [])
    // The route composes the whole note — truncation, the word cap, or an empty
    // result — so there's nothing to reconstruct client-side.
    setNote(data.note || '')
    setPicked(nextPicked)
    setDropped(nextDropped)
    setStage('review')
  }

  const submit = async () => {
    const isText = mode === 'text'
    if (isText ? !passageReady : parsed.length === 0 || tooMany) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/decks/${deckId}/${isText ? 'extract' : 'enrich'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isText ? { text: passage } : { words: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to read that')
      receive(data)
    } catch (err) {
      setError(err.message || 'Failed to read that')
    } finally {
      setLoading(false)
    }
  }

  const chosenSenses = drafts
    .map((draft, i) => (dropped[i] || picked[i] == null ? null : draft.senses[picked[i]]))
    .filter(Boolean)

  const undecided = drafts.filter((draft, i) => !dropped[i] && picked[i] == null).length

  const addCards = async () => {
    if (chosenSenses.length === 0) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // `sense` and `duplicate` ride along unused — the cards route only
        // reads the card fields it knows.
        body: JSON.stringify({ words: chosenSenses }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add cards')
      onAdded(data.cards)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add cards')
      setSaving(false)
    }
  }

  const startOver = () => {
    setStage('input')
    setDrafts([])
    setFailed([])
    setNote('')
    setPicked({})
    setDropped({})
    setError('')
  }

  return (
    <div className="mb-4 rounded-2xl border border-primary/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            {mode === 'text' ? 'Build a deck from a text' : 'Import a word list'}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === 'text'
              ? 'Paste something real you need to understand. We’ll pick out the words worth learning and keep the sentence you met each one in.'
              : 'Paste vocabulary from a textbook, a class, or your notes — one per line. We’ll fill in the translation, part of speech, and an example sentence at your level.'}
          </p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close" className="shrink-0 text-muted-foreground">
          <X className="size-4" />
        </Button>
      </div>

      {stage === 'input' ? (
        <>
          <div className="mb-3 inline-flex rounded-lg bg-muted p-0.5 text-sm">
            {[['list', 'A word list'], ['text', 'A whole text']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setMode(value); setError('') }}
                className={`rounded-md px-3 py-1 ${mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>

          {mode === 'text' ? (
            <>
              <textarea
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder={TEXT_PLACEHOLDER}
                rows={9}
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Spanish text. Proper nouns, numbers, and words already in this deck are left out.
              </p>
            </>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={6}
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Spanish, English, or both — in whichever order you have them. One word or phrase per line.
              </p>
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={submit}
              disabled={loading || (mode === 'text' ? !passageReady : parsed.length === 0 || tooMany)}
              className="rounded-lg">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {loading
                ? (mode === 'text' ? 'Reading your text…' : 'Filling in the details…')
                : (mode === 'text' ? 'Find the words to learn' : 'Fill in the details')}
            </Button>
            {mode === 'text'
              ? passage.trim().length > 0 && !passageReady && (
                  <span className="text-xs text-muted-foreground">A bit more text, please</span>
                )
              : parsed.length > 0 && (
                  <span className={`text-xs ${tooMany ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {tooMany
                      ? `${parsed.length} words — ${MAX_WORDS} is the most we can do at once.`
                      : `${parsed.length} ${parsed.length === 1 ? 'word' : 'words'}`}
                  </span>
                )}
          </div>
        </>
      ) : (
        <>
          {/* Above the list, not below it: this says how much of their text we
              actually covered, which changes how they read the 30 rows that
              follow. At the bottom it reads as a footnote to work already done. */}
          {note && (
            <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{note}</p>
          )}

          <div className="space-y-2">
            {drafts.map((draft, i) => (
              <DraftRow
                key={`${draft.input}-${i}`}
                draft={draft}
                pickedIndex={picked[i]}
                dropped={Boolean(dropped[i])}
                onPick={(senseIndex) => setPicked((p) => ({ ...p, [i]: senseIndex }))}
                onToggleDrop={() => setDropped((d) => ({ ...d, [i]: !d[i] }))}
              />
            ))}
          </div>

          {failed.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Couldn&rsquo;t make sense of: {failed.join(', ')}. Check the spelling and paste those again.
            </p>
          )}

          {undecided > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              {undecided === 1
                ? '1 word has more than one meaning — pick which you meant, or skip it.'
                : `${undecided} words have more than one meaning — pick which you meant, or skip them.`}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={addCards} disabled={saving || chosenSenses.length === 0} className="rounded-lg">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              {saving
                ? 'Adding…'
                : `Add ${chosenSenses.length} ${chosenSenses.length === 1 ? 'card' : 'cards'}`}
            </Button>
            <Button size="sm" variant="ghost" onClick={startOver} disabled={saving} className="rounded-lg">
              <RotateCcw className="size-3.5" /> {mode === 'text' ? 'Paste a different text' : 'Paste a different list'}
            </Button>
          </div>
        </>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}

// One pending card. Three shapes: waiting on a meaning, ready to add, or
// skipped — with the skip always reversible, since a word excluded as a
// duplicate might be the sense the learner actually wanted.
function DraftRow({ draft, pickedIndex, dropped, onPick, onToggleDrop }) {
  const sense = pickedIndex == null ? null : draft.senses[pickedIndex]

  if (dropped) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2">
        <span className="truncate text-sm text-muted-foreground line-through">{draft.input}</span>
        <div className="flex shrink-0 items-center gap-2">
          {draft.senses[0]?.duplicate && <span className="text-xs text-muted-foreground">already in this deck</span>}
          <Button size="sm" variant="ghost" onClick={onToggleDrop} className="h-7 rounded-lg text-xs">
            Add anyway
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {sense ? (
            <>
              <p className="text-sm font-medium text-foreground">
                {sense.word}
                {sense.translation && <span className="font-normal text-muted-foreground"> — {sense.translation}</span>}
              </p>
              {sense.example && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sense.example}</p>}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                {draft.input}
                <span className="font-normal text-muted-foreground"> — which one did you mean?</span>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {draft.senses.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onPick(index)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
                    {option.word}
                    {option.sense && <span className="text-muted-foreground/80"> · {option.sense}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onToggleDrop} aria-label={`Skip ${draft.input}`} className="shrink-0 text-muted-foreground">
          <X className="size-4" />
        </Button>
      </div>

      {/* Once a meaning is chosen the alternatives stay one tap away — the
          model orders them by likelihood, not by what the learner meant. */}
      {sense && draft.senses.length > 1 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {draft.senses.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onPick(index)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                index === pickedIndex
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}>
              {option.word}
              {option.sense && <span className="text-muted-foreground/80"> · {option.sense}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
