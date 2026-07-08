'use client'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speak } from '@/lib/speech'

// Small speaker icon that reads `text` aloud in Spanish. Stops click
// propagation so it can sit on top of a clickable flashcard without
// triggering the flip.
export default function SpeakButton({ text, gender, className = '' }) {
  if (!text) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={(e) => { e.stopPropagation(); speak(text, gender) }}
      aria-label={`Play pronunciation of ${text}`}
      className={`text-muted-foreground hover:text-primary ${className}`}>
      <Volume2 className="size-4" />
    </Button>
  )
}
