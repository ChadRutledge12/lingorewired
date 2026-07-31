'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'

// How the learner wants to fill the deck, chosen before it exists.
//
// Importing used to live only inside a deck you'd already made, which put the
// steps backwards: pasting a letter from the town hall is the *reason* to start
// a deck, not something you think of afterwards. Same tabs as the import panel
// itself, so the choice made here is the tab you land on.
// Listed vertically rather than as a tab strip: the labels alone don't tell you
// the difference between pasting a text and pasting a list, so each one carries
// its explanation, and nothing has to be shortened to fit a phone.
const WAYS = [
  {
    value: 'text',
    label: 'A whole text',
    blurb: 'A letter, an article, a message — we pick out the words worth learning.',
    placeholder: 'e.g. Letter from the town hall',
  },
  {
    value: 'list',
    label: 'A word list',
    blurb: 'Vocabulary you already have — we fill in translations and examples.',
    placeholder: 'e.g. Aula 2, Unit 4',
  },
  {
    value: 'blank',
    label: 'Nothing yet',
    blurb: 'Start empty and add cards one at a time.',
    placeholder: 'e.g. Doctor’s appointment',
  },
]

// Creates a deck for learners who bring their own vocabulary — from a text,
// from a list they already have, or by hand.
export default function NewDeckButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [way, setWay] = useState('text')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const chosen = WAYS.find((w) => w.value === way)

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, words: [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create deck')
      // The deck page opens the import panel on the tab chosen here, so the
      // paste box is the first thing waiting rather than something to go find.
      router.push(`/decks/${data.deckId}${way === 'blank' ? '' : `?import=${way}`}`)
    } catch (err) {
      setError(err.message || 'Failed to create deck')
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
          <FolderPlus className="size-4" /> New deck
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form onSubmit={(e) => { e.preventDefault(); create() }} className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Start a deck</p>
            <p className="text-xs text-muted-foreground">What are you starting from?</p>
          </div>

          <div className="space-y-1.5">
            {WAYS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWay(w.value)}
                aria-pressed={way === w.value}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  way === w.value
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border hover:border-primary/40'
                }`}>
                <span className="block text-sm font-medium text-foreground">{w.label}</span>
                <span className="block text-xs text-muted-foreground">{w.blurb}</span>
              </button>
            ))}
          </div>

          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={chosen.placeholder}
            aria-label="Deck name"
            className="rounded-lg"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={creating || !name.trim()} className="w-full rounded-lg">
            {creating && <Loader2 className="size-4 animate-spin" />}
            {way === 'blank' ? 'Create deck' : 'Create and paste'}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
