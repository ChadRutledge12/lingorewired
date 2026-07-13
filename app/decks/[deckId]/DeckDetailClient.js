'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, Check, X, Loader2, Download, Sparkles, Share2, Lightbulb, Plus, BookOpen, Languages } from 'lucide-react'
import { exportDeckPdf } from '@/lib/exportPdf'
import { masteryOf } from '@/lib/mastery'
import { tierInfo } from '@/lib/tier'
import WordCloud from '@/components/WordCloud'
import SuggestionsList from '@/components/SuggestionsList'
import { LogoLink } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'article', 'interjection', 'numeral', 'phrase', 'other']

const EMPTY_DRAFT = { word: '', translation: '', part_of_speech: '', example: '', example_translation: '' }

// A few reading scenarios drawn from the deck's onboarding profile, so the
// suggestions feel personal instead of generic. Falls back to broadly useful
// prompts when there's no profile.
function scenarioSuggestions(profile) {
  const out = []
  for (const c of (profile?.contexts || []).slice(0, 2)) out.push(`A day at ${c.toLowerCase()}`)
  for (const i of (profile?.interests || []).slice(0, 2)) out.push(`A story about ${i.toLowerCase()}`)
  if (out.length === 0) return ['A conversation with a friend', 'A small everyday mishap', 'A trip to the market']
  return out.slice(0, 4)
}

function DeckName({ deck }) {
  const [savedName, setSavedName] = useState(deck.name)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(deck.name)
  const [saving, setSaving] = useState(false)

  const startRename = () => {
    setDraft(savedName)
    setRenaming(true)
  }

  const save = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === savedName) { setRenaming(false); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error()
      setSavedName(trimmed)
      setRenaming(false)
    } catch {
      // keep the form open so the user can retry
    } finally {
      setSaving(false)
    }
  }

  if (renaming) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); save() }} className="flex items-center gap-1 flex-1">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus className="rounded-lg h-9" />
        <Button type="submit" size="icon-sm" variant="ghost" disabled={saving} aria-label="Save name">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={() => setRenaming(false)} disabled={saving} aria-label="Cancel">
          <X className="size-4" />
        </Button>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={startRename}
      className="group flex items-center gap-1.5 text-left flex-1 min-w-0">
      <h1 className="text-xl font-semibold text-foreground truncate">{savedName}</h1>
      <Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
    </button>
  )
}

// Manual card entry — the same fields the editor uses, starting blank.
// Word is the only required field; everything else is optional so quick
// textbook transcription stays quick.
function AddCardForm({ deckId, onAdded, onCancel }) {
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT, part_of_speech: 'other' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!draft.word.trim()) { setError('The Spanish word is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add card')
      onAdded(data.card)
      // Keep the form open with cleared fields — adding a list of words
      // from a textbook shouldn't need a click between every entry.
      setDraft({ ...EMPTY_DRAFT, part_of_speech: 'other' })
    } catch (err) {
      setError(err.message || 'Failed to add card')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save() }}
      className="border border-primary/30 rounded-xl p-4 space-y-2">
      <div className="flex gap-2">
        <Input autoFocus value={draft.word} onChange={(e) => setDraft((d) => ({ ...d, word: e.target.value }))} placeholder="Spanish word *" className="rounded-lg" />
        <Select value={draft.part_of_speech} onValueChange={(v) => setDraft((d) => ({ ...d, part_of_speech: v }))}>
          <SelectTrigger size="sm" className="w-32 rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            {POS_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Input value={draft.translation} onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))} placeholder="Translation" className="rounded-lg" />
      <Input value={draft.example} onChange={(e) => setDraft((d) => ({ ...d, example: e.target.value }))} placeholder="Example sentence (optional)" className="rounded-lg" />
      <Input value={draft.example_translation} onChange={(e) => setDraft((d) => ({ ...d, example_translation: e.target.value }))} placeholder="Example translation (optional)" className="rounded-lg" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving} className="rounded-lg">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Add card
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="rounded-lg">
          Done
        </Button>
      </div>
    </form>
  )
}

function CardRow({ card, onSaved, onDeleted, onExplore }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const startEdit = () => {
    setDraft({
      word: card.word || '',
      translation: card.translation || '',
      part_of_speech: card.part_of_speech || 'other',
      example: card.example || '',
      example_translation: card.example_translation || '',
    })
    setError('')
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      onSaved(card.id, draft)
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    const res = await fetch(`/api/cards/${card.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted(card.id)
  }

  if (editing) {
    return (
      <div className="border border-primary/30 rounded-xl p-4 space-y-2">
        <div className="flex gap-2">
          <Input value={draft.word} onChange={(e) => setDraft((d) => ({ ...d, word: e.target.value }))} placeholder="Word" className="rounded-lg" />
          <Select value={draft.part_of_speech} onValueChange={(v) => setDraft((d) => ({ ...d, part_of_speech: v }))}>
            <SelectTrigger size="sm" className="w-32 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POS_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input value={draft.translation} onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))} placeholder="Translation" className="rounded-lg" />
        <Input value={draft.example} onChange={(e) => setDraft((d) => ({ ...d, example: e.target.value }))} placeholder="Example sentence" className="rounded-lg" />
        <Input value={draft.example_translation} onChange={(e) => setDraft((d) => ({ ...d, example_translation: e.target.value }))} placeholder="Example translation" className="rounded-lg" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={save} disabled={saving} className="rounded-lg">
            {saving && <Loader2 className="size-3.5 animate-spin" />} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="rounded-lg">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const mastery = masteryOf(card)

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onExplore(card)}
            className="text-lg font-semibold text-foreground hover:text-primary hover:underline decoration-dotted underline-offset-4 truncate"
            title="See related words">
            {card.word}
          </button>
          <span className="text-[11px] text-muted-foreground italic shrink-0">{card.part_of_speech}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            title={`Mastery: ${mastery.label}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${mastery.badgeClass}`}>
            <span className={`size-1.5 rounded-full ${mastery.dotClass}`} />
            {mastery.label}
          </span>
          {card.tier && <Badge variant="outline" className={tierInfo(card.tier).badgeClass}>{tierInfo(card.tier).label}</Badge>}
          <Button size="icon-sm" variant="ghost" onClick={() => onExplore(card)} aria-label={`See words related to ${card.word}`} className="text-muted-foreground">
            <Share2 className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={startEdit} aria-label={`Edit ${card.word}`} className="text-muted-foreground">
            <Pencil className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`Delete ${card.word}`} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{card.word}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>This removes the card and its review history. This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); remove() }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="text-sm text-muted-foreground mb-2">{card.translation}</div>
      <div className="text-sm text-foreground/80 border-l-2 border-border pl-3 italic mb-1">{card.example}</div>
      <div className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">{card.example_translation}</div>
    </div>
  )
}

export default function DeckDetailClient({ deck, initialCards, dueCount, initialReadings = [] }) {
  const router = useRouter()
  const [cards, setCards] = useState(initialCards)
  const [amplifying, setAmplifying] = useState(false)
  const [amplifyError, setAmplifyError] = useState('')
  const [exploreCard, setExploreCard] = useState(null)
  const [exploreRelated, setExploreRelated] = useState(null)
  const [exploreLoading, setExploreLoading] = useState(false)
  const [exploreError, setExploreError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')
  const [addingTopic, setAddingTopic] = useState('')
  const [addingCard, setAddingCard] = useState(false)
  const [readings] = useState(initialReadings)
  const [readingPanelOpen, setReadingPanelOpen] = useState(false)
  const [readingScenario, setReadingScenario] = useState('')
  const [readingLength, setReadingLength] = useState('short')
  const [creatingReading, setCreatingReading] = useState(false)
  const [readingError, setReadingError] = useState('')

  const createReading = async () => {
    setCreatingReading(true)
    setReadingError('')
    try {
      const res = await fetch(`/api/decks/${deck.id}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: readingScenario, length: readingLength }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create reading')
      router.push(`/readings/${data.readingId}`)
    } catch (err) {
      setReadingError(err.message || 'Failed to create reading')
      setCreatingReading(false)
    }
  }

  const handleSaved = (id, draft) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...draft } : c)))
  }
  const handleDeleted = (id) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  const fetchRelated = async (card) => {
    setExploreLoading(true)
    setExploreError('')
    try {
      const res = await fetch(`/api/cards/${card.id}/related`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate related words')
      setExploreRelated(data.related)
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, related_words: data.related } : c)))
    } catch (err) {
      setExploreError(err.message || 'Failed to generate related words')
    } finally {
      setExploreLoading(false)
    }
  }

  const openExplore = (card) => {
    setExploreCard(card)
    setExploreError('')
    if (card.related_words) {
      setExploreRelated(card.related_words)
    } else {
      setExploreRelated(null)
      fetchRelated(card)
    }
  }

  const amplifyDeck = async () => {
    setAmplifying(true)
    setAmplifyError('')
    try {
      const res = await fetch(`/api/decks/${deck.id}/amplify`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add related words')
      if (data.cards.length === 0) {
        setAmplifyError("Couldn't generate any new related words right now — try again in a moment.")
      } else {
        setCards((prev) => [...prev, ...data.cards])
      }
    } catch (err) {
      setAmplifyError(err.message || 'Failed to add related words')
    } finally {
      setAmplifying(false)
    }
  }

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true)
    setSuggestionsError('')
    try {
      const res = await fetch(`/api/decks/${deck.id}/suggest-topics`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate suggestions')
      setSuggestions(data.suggestions)
    } catch (err) {
      setSuggestionsError(err.message || 'Failed to generate suggestions')
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const addSuggestedTopic = async (topic) => {
    setAddingTopic(topic)
    setAmplifyError('')
    try {
      const res = await fetch(`/api/decks/${deck.id}/amplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add words for that topic')
      setCards((prev) => [...prev, ...data.cards])
      setSuggestions((prev) => prev.filter((s) => s.topic !== topic))
    } catch (err) {
      setAmplifyError(err.message || 'Failed to add words for that topic')
    } finally {
      setAddingTopic('')
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <LogoLink className="mb-4" />
        <Link href="/decks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-3.5" /> Back to decks
        </Link>

        <div className="mb-3 flex items-center gap-2">
          <DeckName deck={deck} />
          {dueCount > 0 && (
            <Button asChild className="rounded-xl shrink-0">
              <Link href={`/review/${deck.id}`}>Review {dueCount} now</Link>
            </Button>
          )}
        </div>

        <div className={`flex flex-wrap gap-2 ${amplifyError ? 'mb-1' : 'mb-6'}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={amplifyDeck}
            disabled={amplifying}
            className="rounded-xl">
            {amplifying ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {amplifying ? 'Adding related words...' : 'Amplify deck'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingCard(true)}
            disabled={addingCard}
            className="rounded-xl">
            <Plus className="size-3.5" /> Add card
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReadingPanelOpen((o) => !o)}
            disabled={cards.length === 0}
            className="rounded-xl">
            <BookOpen className="size-3.5" /> Create a reading
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            disabled={cards.length === 0}
            className="rounded-xl">
            <Link href={`/translate/${deck.id}`}><Languages className="size-3.5" /> Translate practice</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportDeckPdf(deck.name, cards)}
            disabled={cards.length === 0}
            className="rounded-xl">
            <Download className="size-3.5" /> Download PDF
          </Button>
        </div>
        {amplifyError && <p className="text-sm text-red-500 mb-6">{amplifyError}</p>}

        {readingPanelOpen && (
          <div className="mb-6 rounded-2xl border border-primary/30 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Turn this deck into a reading</p>
              <p className="text-xs text-muted-foreground">A short Spanish story using your words in context — with tap-to-reveal translation and audio.</p>
            </div>
            <textarea
              value={readingScenario}
              onChange={(e) => setReadingScenario(e.target.value)}
              placeholder="Set the scene (optional): a day at the market, a job interview, a chat with your abuela..."
              rows={2}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-1.5">
              {scenarioSuggestions(deck.profile).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReadingScenario(s)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={readingLength} onValueChange={setReadingLength}>
                <SelectTrigger size="sm" className="w-32 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={createReading} disabled={creatingReading} className="rounded-lg">
                {creatingReading ? <Loader2 className="size-3.5 animate-spin" /> : <BookOpen className="size-3.5" />}
                {creatingReading ? 'Writing your story...' : 'Generate reading'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReadingPanelOpen(false)} disabled={creatingReading} className="rounded-lg">
                Cancel
              </Button>
            </div>
            {readingError && <p className="text-sm text-red-500">{readingError}</p>}
          </div>
        )}

        {readings.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Readings</p>
            <div className="space-y-2">
              {readings.map((r) => (
                <Link
                  key={r.id}
                  href={`/readings/${r.id}`}
                  className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-foreground hover:border-primary/40 hover:bg-muted/50">
                  <BookOpen className="size-4 shrink-0 text-primary" />
                  <span className="truncate font-medium">{r.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {addingCard && (
          <div className="mb-3">
            <AddCardForm
              deckId={deck.id}
              onAdded={(card) => setCards((prev) => [...prev, card])}
              onCancel={() => setAddingCard(false)}
            />
          </div>
        )}

        {cards.length === 0 && !addingCard ? (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-foreground font-medium mb-1">This deck is empty</p>
            <p className="text-sm text-muted-foreground mb-4">Add your own vocabulary — from a textbook, class, or anywhere else.</p>
            <Button onClick={() => setAddingCard(true)} className="rounded-xl">
              <Plus className="size-4" /> Add your first card
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <CardRow key={card.id} card={card} onSaved={handleSaved} onDeleted={handleDeleted} onExplore={openExplore} />
            ))}
          </div>
        )}

        {cards.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            {suggestions.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Suggested next topics</p>
                <SuggestionsList suggestions={suggestions} onSelect={addSuggestedTopic} />
                {addingTopic && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Adding words for &ldquo;{addingTopic}&rdquo;...
                  </p>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSuggestions}
                disabled={suggestionsLoading}
                className="rounded-xl">
                {suggestionsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                {suggestionsLoading ? 'Thinking of ideas...' : 'Suggest topics'}
              </Button>
            )}
            {suggestionsError && <p className="mt-2 text-sm text-red-500">{suggestionsError}</p>}
          </div>
        )}
      </div>

      {exploreCard && (
        <WordCloud
          card={exploreCard}
          related={exploreRelated}
          loading={exploreLoading}
          error={exploreError}
          onClose={() => setExploreCard(null)}
          onRetry={() => fetchRelated(exploreCard)}
        />
      )}
    </div>
  )
}
