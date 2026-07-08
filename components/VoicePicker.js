'use client'
import { Volume2 } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { VOICE_GENDERS } from '@/lib/speech'

// Dropdown to switch between the best-guess male/female Spanish voice at any
// time. (The Web Speech API doesn't expose gender directly — see lib/speech.js
// for how it's inferred.)
export default function VoicePicker({ gender, onChange, className = '' }) {
  return (
    <Select value={gender} onValueChange={onChange}>
      <SelectTrigger size="sm" className={`w-auto gap-1.5 rounded-full border-none bg-transparent shadow-none ${className}`}>
        <Volume2 className="size-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {VOICE_GENDERS.map((g) => (
          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
