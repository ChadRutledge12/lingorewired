'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover'

// Creates a blank deck for learners who bring their own vocabulary
// (textbooks, classes, tutors) — cards get added by hand on the deck page.
export default function NewEmptyDeckButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

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
      router.push(`/decks/${data.deckId}`)
    } catch (err) {
      setError(err.message || 'Failed to create deck')
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <FolderPlus className="size-4" /> Empty deck
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form onSubmit={(e) => { e.preventDefault(); create() }} className="space-y-2">
          <p className="text-sm font-medium text-foreground">Name your deck</p>
          <p className="text-xs text-muted-foreground">Start blank and add your own vocabulary — from a textbook, class, or anywhere else.</p>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aula 2, Unit 4"
            className="rounded-lg"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={creating || !name.trim()} className="w-full rounded-lg">
            {creating && <Loader2 className="size-4 animate-spin" />} Create deck
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
