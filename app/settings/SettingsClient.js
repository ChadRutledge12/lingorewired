'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LogoLink } from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { ChipGroup, CustomChipInput } from '@/components/ProfileChips'
import {
  EMPTY_PROFILE,
  LEVEL_OPTIONS,
  LANGUAGE_OPTIONS,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  CONTEXT_OPTIONS,
  LOCATION_OPTIONS,
  REGISTER_OPTIONS,
  REGISTER_DESCRIPTIONS,
  NOTES_MAX,
} from '@/lib/learningProfile'

function Section({ title, hint, children }) {
  return (
    <section className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-1 text-base font-semibold text-foreground">{title}</h2>
      {hint && <p className="mb-4 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </section>
  )
}

export default function SettingsClient({ user, profile }) {
  const [answers, setAnswers] = useState({ ...EMPTY_PROFILE, ...(profile || {}) })
  const [otherInputs, setOtherInputs] = useState({ goals: '', interests: '', contexts: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Compared against the current answers to drive the dirty state, and reset
  // on a successful save so "Saved" doesn't linger over fresh edits.
  const [saved, setSaved] = useState(() => JSON.stringify({ ...EMPTY_PROFILE, ...(profile || {}) }))

  const dirty = JSON.stringify(answers) !== saved

  const selectOne = (key, value) => setAnswers(prev => ({ ...prev, [key]: value }))
  const setMany = (key, values) => setAnswers(prev => ({ ...prev, [key]: values }))
  const addOther = (key) => {
    const value = otherInputs[key].trim()
    if (!value) return
    setAnswers(prev => prev[key].includes(value) ? prev : { ...prev, [key]: [...prev[key], value] })
    setOtherInputs(prev => ({ ...prev, [key]: '' }))
  }
  const removeOther = (key, value) =>
    setAnswers(prev => ({ ...prev, [key]: prev[key].filter(v => v !== value) }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile/learning', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save your profile')
      // Adopt the server's normalized copy, so what's on screen matches what
      // was actually stored (trimmed strings, deduped chips).
      const stored = { ...EMPTY_PROFILE, ...data.profile }
      setAnswers(stored)
      setSaved(JSON.stringify(stored))
    } catch (err) {
      setError(err.message || 'Failed to save your profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <LogoLink />
          <div className="flex items-center gap-2">
            <Link href="/decks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Back to decks
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Your learning profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              These answers shape every word set, reading, and topic suggestion the app generates for you.
              Changes apply to new material — decks you&apos;ve already made keep the words they have.
            </p>
          </div>

          <Section title="Your level" hint="Roughly where you are now — new material is pitched here.">
            <ChipGroup type="single" options={LEVEL_OPTIONS} value={answers.level} onChange={v => selectOne('level', v)} className="mb-0" />
          </Section>

          <Section title="Your native language" hint="What translations and explanations are written in.">
            <ChipGroup type="single" options={LANGUAGE_OPTIONS} value={answers.nativeLanguage} onChange={v => selectOne('nativeLanguage', v)} className="mb-0" />
          </Section>

          <Section title="Why you're learning" hint="Your goals steer which words are worth your time.">
            <ChipGroup type="multiple" options={GOAL_OPTIONS} value={answers.goals} onChange={v => setMany('goals', v)} />
            <CustomChipInput
              options={GOAL_OPTIONS}
              values={answers.goals}
              otherValue={otherInputs.goals}
              onOtherChange={v => setOtherInputs(p => ({ ...p, goals: v }))}
              onAdd={() => addOther('goals')}
              onRemove={v => removeOther('goals', v)}
              className="mb-0"
            />
          </Section>

          <Section title="What you're into" hint="The subjects your personal vocabulary is drawn from.">
            <ChipGroup type="multiple" options={INTEREST_OPTIONS} value={answers.interests} onChange={v => setMany('interests', v)} />
            <CustomChipInput
              options={INTEREST_OPTIONS}
              values={answers.interests}
              otherValue={otherInputs.interests}
              onOtherChange={v => setOtherInputs(p => ({ ...p, interests: v }))}
              onAdd={() => addOther('interests')}
              onRemove={v => removeOther('interests', v)}
              className="mb-0"
            />
          </Section>

          <Section title="Where you'll use it" hint="The situations you actually need Spanish in.">
            <ChipGroup type="multiple" options={CONTEXT_OPTIONS} value={answers.contexts} onChange={v => setMany('contexts', v)} />
            <CustomChipInput
              options={CONTEXT_OPTIONS}
              values={answers.contexts}
              otherValue={otherInputs.contexts}
              onOtherChange={v => setOtherInputs(p => ({ ...p, contexts: v }))}
              onAdd={() => addOther('contexts')}
              onRemove={v => removeOther('contexts', v)}
              className="mb-0"
            />
          </Section>

          <Section title="Which Spanish" hint="Sets the dialect — vocabulary and grammar match the place you pick.">
            <ChipGroup type="single" options={LOCATION_OPTIONS} value={answers.location} onChange={v => selectOne('location', v)} className="mb-0" />
          </Section>

          <Section title="How you'll speak">
            <ChipGroup
              type="single"
              options={REGISTER_OPTIONS}
              value={answers.register}
              onChange={v => selectOne('register', v)}
              descriptions={REGISTER_DESCRIPTIONS}
              className="mb-2"
            />
            {/* Tooltips never fire on touch, and this app is phone-first — so
                the explanation is also stated plainly. */}
            <p className="text-xs text-muted-foreground">
              Not sure? tú is casual (friends, family); usted is polite (strangers, work).
            </p>
          </Section>

          <Section
            title="Anything else you want to learn?"
            hint="In your own words — this is passed to the app every time it writes something for you, and it outranks the choices above where they disagree.">
            <Textarea
              value={answers.notes}
              maxLength={NOTES_MAX}
              onChange={e => setAnswers(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. I'm moving to Valencia in March — focus on renting a flat, utilities, and paperwork. I already know food vocabulary well. Please avoid slang."
              className="min-h-28 rounded-xl"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {answers.notes.length} / {NOTES_MAX}
            </p>
          </Section>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3 border-t border-border pt-6">
            <Button onClick={save} disabled={saving || !dirty} className="rounded-xl">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
            {!dirty && !saving && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Check className="size-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
