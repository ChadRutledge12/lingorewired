'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, X, PartyPopper, Save, Download, LogOut, Pencil, Plus } from 'lucide-react'
import { exportDeckPdf } from '@/lib/exportPdf'
import { normalizeWord } from '@/lib/normalizeWord'
import { tierInfo } from '@/lib/tier'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import SpeakButton from '@/components/SpeakButton'
import VoicePicker from '@/components/VoicePicker'
import VoiceDebugInfo from '@/components/VoiceDebugInfo'
import SuggestionsList from '@/components/SuggestionsList'
import Logo from '@/components/Logo'
import GenerationProgress from '@/components/GenerationProgress'
import Calibration from '@/components/Calibration'
import { useVoiceGender } from '@/lib/useVoiceGender'

const LEVEL_OPTIONS = ['Complete beginner', 'A1 — I know a little', 'A2 — Basic phrases', 'B1 — Conversational', 'B2+ — Comfortable']
const LANGUAGE_OPTIONS = ['English', 'French', 'Italian', 'Portuguese', 'German', 'Other']
const GOAL_OPTIONS = ['Travel & get around', 'Work & business', 'Connect with locals', 'Living abroad', 'Academic study', 'Hobby / curiosity']
const INTEREST_OPTIONS = ['Sport & fitness', 'Food & cooking', 'Music', 'Business & finance', 'Nature & outdoors', 'Tech', 'Art & culture', 'Health', 'Scuba diving', 'Law']
const CONTEXT_OPTIONS = ['Restaurants & cafes', 'Meetings & offices', 'Outdoors & activities', 'Hotels & travel', 'Shops & markets', 'Social situations', 'Emergencies', 'Medical settings']
const LOCATION_OPTIONS = ['Spain', 'Mexico', 'Argentina', 'Colombia', 'Latin America (general)', 'Not sure yet']


const chipClasses = 'h-auto rounded-full border px-4 py-2 text-sm font-medium transition data-[state=off]:border-border data-[state=off]:bg-transparent data-[state=off]:text-muted-foreground data-[state=off]:hover:bg-muted data-[state=off]:hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary'

function ChipGroup({ type, options, value, onChange }) {
  return (
    <ToggleGroup
      type={type}
      value={value}
      onValueChange={(v) => {
        if (type === 'single' && !v) return
        onChange(v)
      }}
      className="mb-4 flex w-full flex-wrap justify-start gap-2"
    >
      {options.map(opt => (
        <ToggleGroupItem key={opt} value={opt} className={chipClasses}>
          {opt}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function CustomChipInput({ options, values, otherValue, onOtherChange, onAdd, onRemove }) {
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
      <div className="mb-6 flex gap-2">
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

function TierBadge({ tier }) {
  const info = tierInfo(tier)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`cursor-help ${info.badgeClass}`}>
          {info.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{info.description}</TooltipContent>
    </Tooltip>
  )
}

const EMPTY_ANSWERS = {
  level: '',
  nativeLanguage: '',
  goals: [],
  interests: [],
  contexts: [],
  location: ''
}

export default function Home({ user, lastProfile, startNew = false }) {
  const router = useRouter()
  // `startNew` (from the dashboard's "New set") jumps straight to the
  // prefilled preferences summary (step 7) when there's a profile to carry
  // over, or the first question otherwise — skipping the welcome screen.
  const [step, setStep] = useState(startNew ? (lastProfile ? 7 : 1) : 0)
  const [answers, setAnswers] = useState(
    startNew && lastProfile ? { ...EMPTY_ANSWERS, ...lastProfile } : EMPTY_ANSWERS
  )
  // True while editing one field from the summary — Continue/Back then
  // return straight to the summary instead of marching through every step.
  const [editReturn, setEditReturn] = useState(false)
  const [focusTopic, setFocusTopic] = useState('')
  // Placement calibration (shown once before the first generation). `knownWords`
  // are the words the learner tapped as already-known — fed to the generator as
  // existing words so it doesn't waste the set re-teaching them.
  const [calibrating, setCalibrating] = useState(false)
  const [knownWords, setKnownWords] = useState([])
  // Fast path for a time-pressed learner (e.g. a trip in two weeks): skip
  // goals/interests/contexts with sensible travel defaults, asking only for
  // level + location — two taps instead of six. Calibration still runs
  // (it's already skippable) so the level stays accurate.
  const [fastPath, setFastPath] = useState(false)
  const [loading, setLoading] = useState(false)
  const [words, setWords] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('flashcard')
  const [cardIndex, setCardIndex] = useState(0)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedDeckId, setSavedDeckId] = useState(null)
  const [otherInputs, setOtherInputs] = useState({
    goals: '',
    interests: '',
    contexts: ''
  })
  const { gender: voiceGender, setGender: setVoiceGender } = useVoiceGender()

  const selectOne = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const setMany = (key, values) => {
    setAnswers(prev => ({ ...prev, [key]: values }))
  }

  const toggleMany = (key, value) => {
    setAnswers(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }))
  }

  const addOther = (key) => {
    const value = otherInputs[key].trim()
    if (!value) return
    setAnswers(prev => prev[key].includes(value) ? prev : { ...prev, [key]: [...prev[key], value] })
    setOtherInputs(prev => ({ ...prev, [key]: '' }))
  }

  // Returning users skip the questionnaire: their last deck's profile is
  // preloaded and they land on the summary, where any field can be edited.
  const startNewSet = () => {
    setFastPath(false)
    if (lastProfile) {
      // Dedupe the carried-over multi-select answers — older profiles can
      // hold duplicate custom entries from before the add paths deduped.
      const cleaned = { ...EMPTY_ANSWERS, ...lastProfile }
      for (const key of ['goals', 'interests', 'contexts']) {
        if (Array.isArray(cleaned[key])) cleaned[key] = [...new Set(cleaned[key])]
      }
      setAnswers(cleaned)
      setStep(7)
    } else {
      setStep(1)
    }
  }

  // Sensible defaults for a learner in a hurry — travel/essentials-flavored,
  // editable later from the summary if they want to refine it.
  const startFastPath = () => {
    setAnswers({
      ...EMPTY_ANSWERS,
      nativeLanguage: 'English',
      goals: ['Travel & get around'],
      interests: ['Food & cooking'],
      contexts: ['Restaurants & cafes', 'Hotels & travel', 'Shops & markets', 'Emergencies'],
    })
    setFastPath(true)
    setStep(1)
  }

  // Step navigation that understands "I'm just editing one answer".
  const goNext = (next) => {
    if (editReturn) { setEditReturn(false); setStep(7) } else { setStep(next) }
  }
  const goBack = (prev) => {
    if (editReturn) { setEditReturn(false); setStep(7) } else { setStep(prev) }
  }
  const editField = (targetStep) => {
    setEditReturn(true)
    setStep(targetStep)
  }

  const addFocusTopic = () => {
    const value = focusTopic.trim()
    if (!value) return
    setAnswers(prev => prev.interests.includes(value) ? prev : { ...prev, interests: [...prev.interests, value] })
    setFocusTopic('')
  }

  // Initial generation goes through a quick placement step first. "Add more"
  // and topic picks (already-generated set) skip this and call generateWords
  // directly, so calibration only fronts the very first set.
  const beginCalibration = () => {
    setError('')
    setCalibrating(true)
  }

  const handleCalibrationComplete = ({ level, knownWords: known }) => {
    // Persist the calibrated level onto the profile so the summary — and the
    // saved deck.profile — reflect it, then generate with the known words fed in.
    const updated = { ...answers, level }
    setAnswers(updated)
    setKnownWords(known)
    setCalibrating(false)
    generateWords({ ...updated, knownWords: known })
  }

  const handleCalibrationSkip = () => {
    setCalibrating(false)
    generateWords()
  }

  const generateWords = async (profileOverride) => {
    const profile = profileOverride || answers
    // `knownWords` may ride in on the override (from calibration); otherwise fall
    // back to state so any calibration carries through to "add more" too. Keep
    // the raw array out of the request body — the API only wants existingWords.
    const { knownWords: overrideKnown, ...profileFields } = profile
    const known = overrideKnown?.length ? overrideKnown : knownWords
    const existingWords = [...words.map(w => w.word), ...known].join(', ')
    setLoading(true)
    setError('')
    setSavedDeckId(null)
    setSaveOpen(false)
    try {
      const response = await fetch('/api/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileFields,
          addMore: step === 8,
          existingWords
        })
      })
      if (response.status === 401) { router.push('/login?next=/'); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate words')
      setWords(prev => {
        if (step !== 8) return data.words
        const existing = prev.map(w => normalizeWord(w.word))
        const filtered = data.words.filter(w => !existing.includes(normalizeWord(w.word)))
        return [...prev, ...filtered]
      })
      if (step !== 8) setViewMode('flashcard')
      setCardIndex(0)
      setCardFlipped(false)
      setStep(8)
      generateSuggestions(profile, data.words)
    } catch (error) {
      console.error('Error:', error)
      setError(error.message || 'Something went wrong generating your words. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestions = async (profile, generatedWords) => {
    try {
      const response = await fetch('/api/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          currentWords: generatedWords.map(w => w.word).join(', ')
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate suggestions')
      setSuggestions(data.suggestions)
    } catch (error) {
      console.error('Suggestions error:', error)
    }
  }

  const addTopic = (topic) => {
    // Don't re-add a topic the learner already has as an interest.
    const interests = answers.interests.includes(topic) ? answers.interests : [...answers.interests, topic]
    const updated = { ...answers, interests }
    setAnswers(updated)
    generateWords(updated)
  }

  const defaultDeckName = () => {
    const focus = answers.interests[0] || answers.location || 'Spanish'
    return `${focus} · ${new Date().toLocaleDateString()}`
  }

  const saveDeck = async () => {
    const name = saveName.trim()
    if (!name) { setSaveError('Please name your deck'); return }
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, words, profile: answers }),
      })
      if (res.status === 401) { router.push('/login?next=/'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save deck')
      setSavedDeckId(data.deckId)
      setSaveOpen(false)
    } catch (err) {
      setSaveError(err.message || 'Failed to save deck')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (step !== 8 || viewMode !== 'flashcard') return
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') {
        setCardFlipped(false)
        setCardIndex(i => Math.min(i + 1, words.length))
      } else if (e.key === 'ArrowLeft') {
        setCardFlipped(false)
        setCardIndex(i => Math.max(i - 1, 0))
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setCardFlipped(f => !f)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [step, viewMode, words.length])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 sm:p-6">
      <div className={`bg-card text-card-foreground rounded-2xl shadow-sm ring-1 ring-foreground/10 p-6 sm:p-8 w-full transition-[max-width] ${step === 8 && viewMode === 'list' ? 'max-w-2xl' : 'max-w-md'}`}>

        {calibrating ? (
          <Calibration
            selfLevel={answers.level}
            levelOptions={LEVEL_OPTIONS}
            onComplete={handleCalibrationComplete}
            onSkip={handleCalibrationSkip}
          />
        ) : (
        <>

        {/* Progress dots */}
        {step >= 1 && step <= 6 && (
          <div className="flex gap-2 mb-8">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? 'bg-emerald-400' : i === step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        )}

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div>
            <div className="mb-6 flex items-start justify-between gap-2">
              <Logo />
              {user && (
                <form action="/auth/signout" method="post">
                  <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground -mr-2 -mt-1">
                    <LogOut className="size-3.5" /> Sign out
                  </Button>
                </form>
              )}
            </div>
            {user ? (
              <>
                <h1 className="text-2xl font-semibold mb-2 text-foreground">Welcome back</h1>
                <p className="text-muted-foreground text-sm mb-8">Jump back into your saved decks, or build a new vocabulary set.</p>
                <Button asChild className="w-full h-12 rounded-xl text-base mb-2">
                  <Link href="/decks">Continue learning →</Link>
                </Button>
                <Button variant="outline" onClick={startNewSet} className="w-full h-12 rounded-xl text-base mb-2">
                  Create a new set
                </Button>
                <button
                  type="button"
                  onClick={startFastPath}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                  In a hurry? Get travel essentials in 2 taps →
                </button>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold mb-2 text-foreground">Let&apos;s personalise your Spanish</h1>
                <p className="text-muted-foreground text-sm mb-8">Six quick questions so we can build a vocabulary set that matches your life.</p>
                <Button asChild className="w-full h-12 rounded-xl text-base mb-2">
                  <Link href="/login?next=/&mode=signup">Get started</Link>
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{' '}
                  <Link href="/login?next=/" className="font-medium text-primary hover:underline">Log in</Link>
                </p>
                <p className="mt-4 border-t border-border pt-4 text-center text-sm text-muted-foreground">
                  <Link href="/philosophy" className="hover:text-foreground">Why LingoRewired? →</Link>
                </p>
              </>
            )}
          </div>
        )}

        {/* Step 1 — Level */}
        {step === 1 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Step 1 of 6</p>
            <h2 className="text-xl font-semibold mb-1 text-foreground">What&apos;s your current level?</h2>
            <p className={`text-muted-foreground text-sm ${fastPath ? 'mb-1' : 'mb-6'}`}>Be honest — we&apos;ll pitch the words at the right difficulty.</p>
            {fastPath && (
              <p className="text-xs text-primary mb-6">
                Fast path: travel essentials, one more tap for location.{' '}
                <button type="button" onClick={() => setFastPath(false)} className="underline hover:no-underline">
                  Answer all 6 questions instead
                </button>
              </p>
            )}
            <ChipGroup type="single" options={LEVEL_OPTIONS} value={answers.level} onChange={v => selectOne('level', v)} />
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => goBack(0)} className="text-muted-foreground">Back</Button>
              <Button onClick={() => goNext(fastPath ? 6 : 2)} disabled={!answers.level} className="rounded-xl">{editReturn ? 'Done' : 'Continue'}</Button>
            </div>
          </div>
        )}

        {/* Step 2 — Native language */}
        {step === 2 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Step 2 of 6</p>
            <h2 className="text-xl font-semibold mb-1 text-foreground">What&apos;s your native language?</h2>
            <p className="text-muted-foreground text-sm mb-6">Helps us flag useful cognates and avoid common mistakes.</p>
            <ChipGroup type="single" options={LANGUAGE_OPTIONS} value={answers.nativeLanguage} onChange={v => selectOne('nativeLanguage', v)} />
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => goBack(1)} className="text-muted-foreground">Back</Button>
              <Button onClick={() => goNext(3)} disabled={!answers.nativeLanguage} className="rounded-xl">{editReturn ? 'Done' : 'Continue'}</Button>
            </div>
          </div>
        )}

        {/* Step 3 — Goals */}
        {step === 3 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Step 3 of 6</p>
            <h2 className="text-xl font-semibold mb-1 text-foreground">What&apos;s your main goal?</h2>
            <p className="text-muted-foreground text-sm mb-6">Pick as many as apply.</p>
            <ChipGroup type="multiple" options={GOAL_OPTIONS} value={answers.goals} onChange={v => setMany('goals', v)} />
            <CustomChipInput
              options={GOAL_OPTIONS}
              values={answers.goals}
              otherValue={otherInputs.goals}
              onOtherChange={v => setOtherInputs(prev => ({ ...prev, goals: v }))}
              onAdd={() => addOther('goals')}
              onRemove={v => toggleMany('goals', v)}
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => goBack(2)} className="text-muted-foreground">Back</Button>
              <Button onClick={() => goNext(4)} disabled={answers.goals.length === 0} className="rounded-xl">{editReturn ? 'Done' : 'Continue'}</Button>
            </div>
          </div>
        )}

        {/* Step 4 — Interests */}
        {step === 4 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Step 4 of 6</p>
            <h2 className="text-xl font-semibold mb-1 text-foreground">What are your interests?</h2>
            <p className="text-muted-foreground text-sm mb-6">This is where it gets personal.</p>
            <ChipGroup type="multiple" options={INTEREST_OPTIONS} value={answers.interests} onChange={v => setMany('interests', v)} />
            <CustomChipInput
              options={INTEREST_OPTIONS}
              values={answers.interests}
              otherValue={otherInputs.interests}
              onOtherChange={v => setOtherInputs(prev => ({ ...prev, interests: v }))}
              onAdd={() => addOther('interests')}
              onRemove={v => toggleMany('interests', v)}
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => goBack(3)} className="text-muted-foreground">Back</Button>
              <Button onClick={() => goNext(5)} disabled={answers.interests.length === 0} className="rounded-xl">{editReturn ? 'Done' : 'Continue'}</Button>
            </div>
          </div>
        )}

        {/* Step 5 — Contexts */}
        {step === 5 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Step 5 of 6</p>
            <h2 className="text-xl font-semibold mb-1 text-foreground">Where will you use Spanish?</h2>
            <p className="text-muted-foreground text-sm mb-6">Think about the real situations you&apos;ll be in.</p>
            <ChipGroup type="multiple" options={CONTEXT_OPTIONS} value={answers.contexts} onChange={v => setMany('contexts', v)} />
            <CustomChipInput
              options={CONTEXT_OPTIONS}
              values={answers.contexts}
              otherValue={otherInputs.contexts}
              onOtherChange={v => setOtherInputs(prev => ({ ...prev, contexts: v }))}
              onAdd={() => addOther('contexts')}
              onRemove={v => toggleMany('contexts', v)}
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => goBack(4)} className="text-muted-foreground">Back</Button>
              <Button onClick={() => goNext(6)} disabled={answers.contexts.length === 0} className="rounded-xl">{editReturn ? 'Done' : 'Continue'}</Button>
            </div>
          </div>
        )}

        {/* Step 6 — Location */}
        {step === 6 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Step 6 of 6</p>
            <h2 className="text-xl font-semibold mb-1 text-foreground">Where are you based or travelling to?</h2>
            <p className="text-muted-foreground text-sm mb-6">Regional vocabulary varies between countries.</p>
            <ChipGroup type="single" options={LOCATION_OPTIONS} value={answers.location} onChange={v => selectOne('location', v)} />
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => goBack(5)} className="text-muted-foreground">Back</Button>
              <Button onClick={() => setStep(7)} disabled={!answers.location} className="rounded-xl">
                Build my vocab set →
              </Button>
            </div>
          </div>
        )}

        {/* Step 7 — Summary */}
        {step === 7 && (
          <div>
            <h2 className="text-xl font-semibold mb-1 text-foreground">Here&apos;s your profile</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {lastProfile ? 'Carried over from your last set — tweak anything before generating.' : 'Ready to generate your personalised word set.'}
            </p>
            <div className="space-y-3 mb-6">
              {[
                ['Level', answers.level, 1],
                ['Native language', answers.nativeLanguage, 2],
                ['Goals', answers.goals.join(', '), 3],
                ['Interests', answers.interests.join(', '), 4],
                ['Contexts', answers.contexts.join(', '), 5],
                ['Location', answers.location, 6],
              ].map(([label, value, editStep]) => (
                <div key={label} className="flex items-start justify-between gap-2 text-sm border-b border-border pb-3">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <button
                    type="button"
                    onClick={() => editField(editStep)}
                    aria-label={`Edit ${label}`}
                    className="group flex items-center gap-1.5 text-right min-w-0">
                    <span className="text-foreground font-medium">{value || '—'}</span>
                    <Pencil className="size-3 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>

            {/* Cumulative learning: point the next set somewhere specific
                without redoing the whole questionnaire. */}
            <div className="mb-8">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Want to focus on something next?</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. medical vocabulary, job interviews..."
                  value={focusTopic}
                  onChange={e => setFocusTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFocusTopic() } }}
                  className="rounded-full"
                />
                <Button type="button" variant="secondary" onClick={addFocusTopic} disabled={!focusTopic.trim()} className="shrink-0 rounded-full">
                  <Plus className="size-4" /> Add
                </Button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={beginCalibration} disabled={loading} className="w-full h-12 rounded-xl text-base">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? 'Generating...' : 'Generate my words'}
            </Button>
            {loading && (
              <div className="mt-6 space-y-4">
                <GenerationProgress message="Building your vocabulary set…" />
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 8 — Results */}
        {step === 8 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-semibold text-foreground">Your vocabulary set</h2>
              <Link href="/decks" className="text-sm font-medium text-primary hover:underline shrink-0">My decks →</Link>
            </div>
            <p className="text-muted-foreground text-sm mb-4">Personalised for you — start learning.</p>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button variant="outline" onClick={() => { setFastPath(false); setStep(0) }} className="rounded-xl">
                Start over
              </Button>
              <Button onClick={() => generateWords()} disabled={loading} className="rounded-xl">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? 'Adding...' : '+ Add 6 more words'}
              </Button>
              <Button
                variant="outline"
                onClick={() => exportDeckPdf(defaultDeckName(), words)}
                className="rounded-xl sm:w-auto">
                <Download className="size-4" /> PDF
              </Button>
            </div>

            {/* Generation feedback — covers "add 6 more" and picking a
                suggested topic, both of which take ~10s. */}
            {loading && (
              <div className="mb-4">
                <GenerationProgress message="Generating more words…" />
              </div>
            )}

            {/* Save to deck */}
            <div className="mb-4">
              {savedDeckId ? (
                <Alert>
                  <AlertDescription className="flex items-center justify-between gap-2">
                    <span>Saved to your decks.</span>
                    <Link href={`/review/${savedDeckId}`} className="font-medium text-primary hover:underline shrink-0">Review now →</Link>
                  </AlertDescription>
                </Alert>
              ) : saveOpen ? (
                <div>
                  <div className="flex gap-2">
                    <Input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveDeck() } }}
                      placeholder="Deck name"
                      className="rounded-xl"
                      autoFocus
                    />
                    <Button onClick={saveDeck} disabled={saving} className="shrink-0 rounded-xl">
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                  {saveError && <p className="text-sm text-red-500 mt-1">{saveError}</p>}
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => { setSaveOpen(true); if (!saveName) setSaveName(defaultDeckName()) }}
                  className="w-full rounded-xl">
                  <Save className="size-4" /> Save these {words.length} words to a deck
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Mode toggle + pronunciation dialect */}
            <div className="flex items-center justify-between gap-2 mb-6">
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="grid grid-cols-2 w-full sm:w-72">
                  <TabsTrigger value="flashcard">Flashcards</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1">
                <VoicePicker gender={voiceGender} onChange={setVoiceGender} />
                <VoiceDebugInfo />
              </div>
            </div>

            {/* Flashcard mode */}
            {viewMode === 'flashcard' && (
              <div className="mx-auto max-w-md">
                {cardIndex >= words.length ? (
                <div className="text-center py-4">
                  <PartyPopper className="mx-auto mb-2 size-10 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">Batch complete!</h3>
                  <p className="text-muted-foreground text-sm mb-6">You reviewed all {words.length} words.</p>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <Button variant="outline" onClick={() => { setCardIndex(0); setCardFlipped(false) }} className="flex-1 rounded-xl">
                      Review again
                    </Button>
                    <Button onClick={() => setViewMode('list')} className="flex-1 rounded-xl">
                      View as list
                    </Button>
                  </div>
                  {suggestions.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border text-left">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Suggested next topics</p>
                      <SuggestionsList suggestions={suggestions} onSelect={addTopic} />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {words[cardIndex] && (
                    <div className="flashcard-scene h-64 mb-4">
                      <div
                        onClick={() => setCardFlipped(f => !f)}
                        className={`flashcard relative w-full h-full cursor-pointer ${cardFlipped ? 'is-flipped' : ''}`}>
                        <div className="flashcard-face absolute inset-0 rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col items-center justify-center text-center">
                          <Badge variant="outline" className={`mb-4 ${tierInfo(words[cardIndex].tier).badgeClass}`}>
                            {tierInfo(words[cardIndex].tier).label}
                          </Badge>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-2xl font-semibold text-foreground">{words[cardIndex].word}</span>
                            <SpeakButton text={words[cardIndex].word} gender={voiceGender} />
                          </div>
                          <span className="text-sm text-muted-foreground italic">{words[cardIndex].part_of_speech}</span>
                          <span className="text-xs text-muted-foreground/70 mt-6">Tap to reveal</span>
                        </div>
                        <div className="flashcard-face flashcard-face-back absolute inset-0 rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-semibold text-foreground mb-1">{words[cardIndex].translation}</span>
                          <span className="text-xs text-muted-foreground italic mb-4">{words[cardIndex].part_of_speech}</span>
                          <div className="flex items-start gap-1">
                            <span className="text-sm text-foreground/80 italic">{words[cardIndex].example}</span>
                            <SpeakButton text={words[cardIndex].example} gender={voiceGender} className="shrink-0 -mt-1" />
                          </div>
                          <span className="text-xs text-muted-foreground italic mt-1">{words[cardIndex].example_translation}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <Progress value={(cardIndex / words.length) * 100} className="mb-3" />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCardFlipped(false); setCardIndex(i => Math.max(i - 1, 0)) }}
                      disabled={cardIndex === 0}
                      className="text-muted-foreground">
                      ← Prev
                    </Button>
                    <span className="text-xs text-muted-foreground">{cardIndex + 1} / {words.length}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCardFlipped(false); setCardIndex(i => Math.min(i + 1, words.length)) }}
                      className="text-primary hover:text-primary">
                      Next →
                    </Button>
                  </div>
                </div>
                )}
              </div>
            )}

            {/* List mode */}
            {viewMode === 'list' && (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {words.map((w, i) => (
                    <div key={i} className="border border-border rounded-xl p-4">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-semibold text-foreground">{w.word}</span>
                          <SpeakButton text={w.word} gender={voiceGender} />
                          <span className="text-[11px] text-muted-foreground italic">{w.part_of_speech}</span>
                        </div>
                        <TierBadge tier={w.tier} />
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">{w.translation}</div>
                      <div className="text-sm text-foreground/80 border-l-2 border-border pl-3 italic mb-1">{w.example}</div>
                      <div className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">{w.example_translation}</div>
                    </div>
                  ))}
                </div>
                {suggestions.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Suggested next topics</p>
                    <SuggestionsList suggestions={suggestions} onSelect={addTopic} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        </>
        )}

      </div>
    </div>
  )
}
