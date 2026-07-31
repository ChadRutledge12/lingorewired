'use client'
import { Turtle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSlowSpeech } from '@/lib/useSlowSpeech'

// App-wide "read everything slowly" switch — the pace axis next to
// VoicePicker's voice axis.
//
// The turtle always carries a text label rather than standing alone: an icon
// nobody can hover (tooltips never fire on touch, and this app is phone-first)
// is an icon nobody can decode, and a mystery button that silently halves
// playback speed is worse than no button. `note` adds the fuller explanation
// where there's room for it.
export default function SpeechSpeedToggle({ onChange, note = false, className = '' }) {
  const { slow, setSlow } = useSlowSpeech()

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={slow}
      title={slow ? 'Slow read mode is on — tap for normal speed' : 'Toggle slow read mode'}
      onClick={() => { setSlow(!slow); onChange?.(!slow) }}
      className={`gap-1.5 rounded-full ${slow ? 'text-primary' : 'text-muted-foreground'} hover:text-primary ${note ? '' : className}`}>
      <Turtle className="size-3.5" />
      {slow ? 'Slow on' : 'Slow'}
    </Button>
  )

  if (!note) return button

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {button}
      <p className="mt-1 text-xs text-muted-foreground">
        {slow ? 'Slow read mode — every word plays at a slower pace.' : 'Tap the turtle to hear everything read slowly.'}
      </p>
    </div>
  )
}
