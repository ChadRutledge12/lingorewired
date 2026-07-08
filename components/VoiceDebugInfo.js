'use client'
import { useState } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { debugVoiceReport } from '@/lib/speech'

// Small diagnostic panel: shows exactly which voices the browser reports and
// what "male"/"female" actually resolve to, so a mismatch can be diagnosed
// from real data instead of guessing at pitch values.
export default function VoiceDebugInfo() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (report || loading) return
    setLoading(true)
    setReport(await debugVoiceReport())
    setLoading(false)
  }

  return (
    <Popover onOpenChange={(open) => open && load()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Voice diagnostics" className="text-muted-foreground">
          <Info className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-xs">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="size-3.5 animate-spin" /> Checking installed voices...
          </div>
        ) : !report ? null : (
          <div className="space-y-3">
            <div>
              <p className="font-medium text-foreground mb-1">What gets played</p>
              <p>Female → <span className="font-mono">{report.selection.female.name || 'none found'}</span>{' '}
                {report.selection.female.confident ? '(confident match, natural pitch)' : `(fallback, pitch ${report.selection.female.pitch})`}</p>
              <p>Male → <span className="font-mono">{report.selection.male.name || 'none found'}</span>{' '}
                {report.selection.male.confident ? '(confident match, natural pitch)' : `(fallback, pitch ${report.selection.male.pitch})`}</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                {report.spanishVoices.length} Spanish voice{report.spanishVoices.length === 1 ? '' : 's'} found ({report.totalVoices} total on device)
              </p>
              {report.spanishVoices.length === 0 ? (
                <p className="text-muted-foreground">No Spanish voices installed on this device/browser at all.</p>
              ) : (
                <ul className="space-y-1">
                  {report.spanishVoices.map((v, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="font-mono text-foreground">{v.name}</span> · {v.lang} · {v.network ? 'network' : 'local'} · guessed: {v.guessedGender}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
