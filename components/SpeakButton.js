'use client'
import { Volume2, Turtle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { speak } from '@/lib/speech'

// Slow/enunciated playback rate for the turtle button — deliberately slow so
// beginners can catch every syllable, but not so slow it sounds robotic.
const SLOW_RATE = 0.6

// Small speaker icon that reads `text` aloud in Spanish. Stops click
// propagation so it can sit on top of a clickable flashcard without
// triggering the flip. With `slow`, it renders a turtle icon and speaks at a
// reduced rate so learners can hear each sound clearly.
export default function SpeakButton({ text, gender, slow = false, className = '' }) {
  if (!text) return null
  const Icon = slow ? Turtle : Volume2
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={(e) => { e.stopPropagation(); speak(text, gender, slow ? { rate: SLOW_RATE } : undefined) }}
      aria-label={slow ? `Play ${text} slowly` : `Play pronunciation of ${text}`}
      className={`text-muted-foreground hover:text-primary ${className}`}>
      <Icon className="size-4" />
    </Button>
  )
}
