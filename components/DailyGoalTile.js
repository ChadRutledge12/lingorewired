'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Same visual shape as the plain StatTile on /decks, but doubles as an
// editable daily-review-goal setting — click to reveal an inline number
// input, same interaction pattern as the deck-rename control in
// DeckDetailClient.js.
export default function DailyGoalTile({ reviewsToday, dailyGoal }) {
  const router = useRouter()
  const [goal, setGoal] = useState(dailyGoal)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(dailyGoal))
  const [saving, setSaving] = useState(false)

  const met = reviewsToday >= goal
  const chipClasses = met
    ? 'bg-emerald-50 text-emerald-600'
    : 'bg-indigo-50 text-indigo-600'

  const save = async () => {
    const n = parseInt(draft, 10)
    if (!Number.isInteger(n) || n < 1 || n > 500 || n === goal) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_goal: n }),
      })
      if (!res.ok) throw new Error()
      setGoal(n)
      setEditing(false)
      router.refresh()
    } catch {
      // keep the form open so the user can retry
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-2xl bg-slate-100 ring-1 ring-slate-900/10 p-4">
        <div className={`mb-2 flex size-8 items-center justify-center rounded-full ${chipClasses}`}>
          <Target className="size-4" />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={500}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="rounded-lg h-8 w-16 px-2 text-sm bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
          />
          <Button type="submit" size="icon-sm" variant="ghost" disabled={saving} aria-label="Save goal" className="text-slate-500 hover:text-slate-900 hover:bg-slate-200">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => { setDraft(String(goal)); setEditing(false) }}
            disabled={saving}
            aria-label="Cancel"
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-200"
          >
            <X className="size-4" />
          </Button>
        </form>
        <p className="mt-1 text-xs text-slate-500 uppercase tracking-wide">Daily goal</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(String(goal)); setEditing(true) }}
      className="group rounded-2xl bg-slate-100 ring-1 ring-slate-900/10 p-4 text-left w-full"
    >
      <div className={`mb-2 flex size-8 items-center justify-center rounded-full ${chipClasses}`}>
        <Target className="size-4" />
      </div>
      <p className="text-2xl font-semibold text-slate-900">{reviewsToday}/{goal}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wide">Daily goal</p>
    </button>
  )
}
