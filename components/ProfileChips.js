'use client'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// The profile answer controls, shared by the onboarding questionnaire
// (app/HomeClient.js) and the settings page (app/settings) so the two edit
// the same answers with the same affordances.

export const chipClasses = 'h-auto rounded-full border px-4 py-2 text-sm font-medium transition data-[state=off]:border-border data-[state=off]:bg-transparent data-[state=off]:text-muted-foreground data-[state=off]:hover:bg-muted data-[state=off]:hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

// `descriptions` (optional) maps an option label to a short explanation shown
// in a hover/focus tooltip — used where a chip's label alone isn't obvious to
// a beginner (e.g. tú vs usted).
export function ChipGroup({ type, options, value, onChange, descriptions, className = 'mb-4' }) {
  return (
    <ToggleGroup
      type={type}
      value={value}
      onValueChange={(v) => {
        if (type === 'single' && !v) return
        onChange(v)
      }}
      className={`flex w-full flex-wrap justify-start gap-2 ${className}`}
    >
      {options.map(opt => {
        const item = (
          <ToggleGroupItem value={opt} className={chipClasses}>
            {opt}
          </ToggleGroupItem>
        )
        const desc = descriptions?.[opt]
        // The tooltip hangs off a wrapper, not the chip itself: TooltipTrigger
        // `asChild` writes its own data-state ("closed"/"delayed-open") onto
        // the child, which would clobber the ToggleGroupItem's data-state
        // ("on"/"off") that chipClasses styles the selected look from — making
        // a selected chip render as unselected.
        return desc ? (
          <Tooltip key={opt}>
            <TooltipTrigger asChild>
              <span className="inline-flex">{item}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{desc}</TooltipContent>
          </Tooltip>
        ) : (
          <span key={opt} className="contents">{item}</span>
        )
      })}
    </ToggleGroup>
  )
}

export function CustomChipInput({ options, values, otherValue, onOtherChange, onAdd, onRemove, className = 'mb-6' }) {
  // Dedupe defensively so a legacy profile with repeated custom entries
  // renders each chip once (and avoids duplicate React keys).
  const custom = [...new Set(values.filter(v => !options.includes(v)))]
  return (
    <>
      {custom.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {custom.map(v => (
            <Badge key={v} variant="secondary" className="h-auto gap-1 rounded-full py-1 pr-1.5 pl-3">
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                aria-label={`Remove ${v}`}
                className="rounded-full p-0.5 hover:bg-foreground/10">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className={`flex gap-2 ${className}`}>
        <Input
          placeholder="Something else? Type it here..."
          value={otherValue}
          onChange={e => onOtherChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
          className="rounded-full"
        />
        <Button type="button" variant="secondary" onClick={onAdd} className="shrink-0 rounded-full">
          Add
        </Button>
      </div>
    </>
  )
}
