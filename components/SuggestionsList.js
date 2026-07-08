'use client'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Grid of suggested next-topic chips — used both in the onboarding generator
// (before a deck is saved) and on the deck detail page (after), so picking a
// direction to expand into works the same way in both places.
export default function SuggestionsList({ suggestions, onSelect }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {suggestions.map((s, i) => (
        <Button
          key={i}
          type="button"
          variant="outline"
          onClick={() => onSelect(s.topic)}
          className="h-auto w-full flex-col items-start justify-start gap-1 whitespace-normal rounded-xl px-4 py-3 text-left">
          <span className="flex items-start gap-1.5 font-medium">
            <Plus className="mt-0.5 size-3.5 shrink-0 text-primary" />
            {s.topic}
          </span>
          <span className="pl-5 text-xs font-normal text-muted-foreground">{s.reason}</span>
        </Button>
      ))}
    </div>
  )
}
