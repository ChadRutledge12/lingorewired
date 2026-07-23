'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, PartyPopper, Download, LogOut, Pencil, Plus, Lightbulb } from 'lucide-react'
import { exportDeckPdf } from '@/lib/exportPdf'
import { tierInfo } from '@/lib/tier'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import SpeakButton from '@/components/SpeakButton'
import VoicePicker from '@/components/VoicePicker'
import VoiceDebugInfo from '@/components/VoiceDebugInfo'
import SuggestionsList from '@/components/SuggestionsList'
import { LogoMark, RED as BRAND_RED } from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import GenerationProgress from '@/components/GenerationProgress'
import Calibration from '@/components/Calibration'
import SurvivalGuidePicker from '@/components/SurvivalGuidePicker'
import { useVoiceGender } from '@/lib/useVoiceGender'
import { SURVIVAL_GUIDES } from '@/lib/survivalGuides'
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
  MULTI_FIELDS,
} from '@/lib/learningProfile'

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

// The questionnaire edits the same shape the settings page does — see
// lib/learningProfile.js. (`notes` isn't asked for here; it's set on
// /settings, and carries through untouched when a profile is loaded.)
const EMPTY_ANSWERS = EMPTY_PROFILE

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
  // Premade "survival guide" decks (situation picker) for a time-pressed
  // learner — instant, static A0–A1 word lists, no questionnaire or AI call.
  const [survivalPicker, setSurvivalPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [words, setWords] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('flashcard')
  const [cardIndex, setCardIndex] = useState(0)
  const [cardFlipped, setCardFlipped] = useState(false)
  // Per-card self-rating from flashcard mode, keyed by index into `words`
  // ('learning' | 'easy'). Drives "Review again": hardest (and unrated)
  // cards come back, "easy" ones are dropped from the next pass. `reviewOrder`
  // is null for the normal sequential pass, or an explicit index order once
  // a filtered "Review again" pass has been built.
  const [cardRatings, setCardRatings] = useState({})
  const [reviewOrder, setReviewOrder] = useState(null)
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
    if (lastProfile) {
      // Dedupe the carried-over multi-select answers — older profiles can
      // hold duplicate custom entries from before the add paths deduped.
      const cleaned = { ...EMPTY_ANSWERS, ...lastProfile }
      for (const key of MULTI_FIELDS) {
        if (Array.isArray(cleaned[key])) cleaned[key] = [...new Set(cleaned[key])]
      }
      setAnswers(cleaned)
      setStep(7)
    } else {
      setStep(1)
    }
  }

  // Instantly saves a premade survival-guide deck — no questionnaire, no
  // calibration, no generation call. `answers` gets set to a minimal profile
  // so the existing createDeck/defaultDeckNameFor/addMoreWords (amplify)
  // plumbing all keep working exactly as they do for an AI-generated set.
  const startSurvivalGuide = (guide) => {
    const profile = { ...EMPTY_ANSWERS, level: 'Complete beginner', interests: [guide.title] }
    setAnswers(profile)
    setKnownWords([])
    setSurvivalPicker(false)
    setWords(guide.words)
    setViewMode('list')
    setCardIndex(0)
    setCardFlipped(false)
    setCardRatings({})
    setReviewOrder(null)
    setSuggestions([])
    setStep(8)
    generateSuggestions(profile, guide.words)
    createDeck(profile, guide.words)
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

  // Generates the FIRST batch only (from the summary, after calibration).
  // Subsequent additions ("+ Add 6 more", picking a suggested topic) go
  // through addMoreWords/the amplify endpoint instead, since by then the
  // deck already exists and should be extended directly, not regenerated
  // locally and saved later.
  const generateWords = async (profileOverride) => {
    const profile = profileOverride || answers
    // `knownWords` rides in on the override from calibration — keep the raw
    // array out of the request body, the API only wants existingWords text.
    const { knownWords: known = [], ...profileFields } = profile
    setLoading(true)
    setError('')
    setSavedDeckId(null)
    setSaveError('')
    try {
      const response = await fetch('/api/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileFields, existingWords: known.join(', ') })
      })
      if (response.status === 401) { router.push('/login?next=/'); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate words')
      setWords(data.words)
      setViewMode('flashcard')
      setCardIndex(0)
      setCardFlipped(false)
      setCardRatings({})
      setReviewOrder(null)
      setStep(8)
      generateSuggestions(profile, data.words)
      // Auto-save immediately — full deck functionality (review, etc.) is
      // available right away instead of requiring a separate save step.
      createDeck(profile, data.words)
    } catch (error) {
      console.error('Error:', error)
      setError(error.message || 'Something went wrong generating your words. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestions = async (profile, generatedWords) => {
    setSuggestionsLoading(true)
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
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const defaultDeckNameFor = (profile) => {
    const focus = profile.interests?.[0] || profile.location || 'Spanish'
    return `${focus} · ${new Date().toLocaleDateString()}`
  }
  const defaultDeckName = () => defaultDeckNameFor(answers)

  // Auto-saves the just-generated batch as a new deck — no manual "save"
  // step, so full deck functionality (review, etc.) is available right away.
  const createDeck = async (profile, generatedWords) => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: defaultDeckNameFor(profile), words: generatedWords, profile }),
      })
      if (res.status === 401) { router.push('/login?next=/'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save deck')
      setSavedDeckId(data.deckId)
    } catch (err) {
      setSaveError(err.message || 'Failed to save your deck automatically')
    } finally {
      setSaving(false)
    }
  }

  // Extends the already-saved deck directly (used by both "+ Add 6 more
  // words" and picking a suggested topic) via the amplify endpoint, which
  // generates in the deck's context and persists in one call — no local
  // accumulation + separate save needed since the deck already exists.
  const addMoreWords = async (topic) => {
    if (!savedDeckId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/decks/${savedDeckId}/amplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topic ? { topic } : {}),
      })
      if (res.status === 401) { router.push('/login?next=/'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate more words')
      if (topic) {
        setAnswers(prev => prev.interests.includes(topic) ? prev : { ...prev, interests: [...prev.interests, topic] })
      }
      const newCards = data.cards || []
      const next = [...words, ...newCards]
      setWords(next)
      // If a filtered "Review again" pass is active, append the new cards to
      // it too — otherwise they'd be added to `words` but never appear in
      // flashcard mode until the next full reset.
      if (newCards.length > 0) {
        setReviewOrder(prev => prev == null ? null : [...prev, ...newCards.map((_, k) => words.length + k)])
      }
      generateSuggestions(answers, next)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // The order flashcard mode actually walks: sequential 0..N-1 normally, or
  // the filtered/reordered subset built by reviewAgain() after a first pass.
  const activeOrder = reviewOrder ?? words.map((_, i) => i)
  const currentCard = words[activeOrder[cardIndex]]

  const rateCard = (rating) => {
    const wordIdx = activeOrder[cardIndex]
    setCardRatings(prev => ({ ...prev, [wordIdx]: rating }))
    setCardFlipped(false)
    setCardIndex(i => Math.min(i + 1, activeOrder.length))
  }

  // Hardest (self-rated "still learning") first, then anything not yet
  // rated (skipped via Prev/Next without flipping) — "easy" cards are
  // dropped entirely, so each pass narrows toward just the tricky words.
  const weakIndices = [
    ...activeOrder.filter(i => cardRatings[i] === 'learning'),
    ...activeOrder.filter(i => cardRatings[i] == null),
  ]

  const reviewAgain = () => {
    setReviewOrder(weakIndices)
    setCardIndex(0)
    setCardFlipped(false)
  }

  useEffect(() => {
    if (step !== 8 || viewMode !== 'flashcard') return
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') {
        setCardFlipped(false)
        setCardIndex(i => Math.min(i + 1, activeOrder.length))
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
  }, [step, viewMode, activeOrder.length])

  // The welcome screen is a full-bleed landing page, not the compact card
  // every other step uses — it's the one screen with no back button and
  // nothing above it, so it gets room to breathe instead of floating in a
  // small box. Picking a survival guide (from this same screen) drops into
  // the compact-card picker below, so it's excluded here even though `step`
  // itself stays 0 while that picker is open.
  const isLanding = step === 0 && !survivalPicker

  if (isLanding) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f1442]">
        <div className="px-6 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-3" role="img" aria-label="LingoRewired">
            <LogoMark className="size-10 sm:size-14" />
            <span className="font-display text-xl sm:text-3xl font-semibold tracking-tight leading-none" aria-hidden="true">
              <span className="text-foreground dark:text-white">Lingo</span><span style={{ color: BRAND_RED }}>Rewired</span>
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            {user && (
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10">
                  <LogOut className="size-3.5" /> Sign out
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center px-6 py-16">
          <div className="w-full max-w-xl">
            {user ? (
              <>
                <h1 className="font-display text-5xl sm:text-6xl font-medium mb-5 text-foreground dark:text-white">Welcome back</h1>
                <p className="text-muted-foreground dark:text-white/60 text-lg mb-10">Jump back into your saved decks, or build a new vocabulary set.</p>
                <Button asChild className="w-full h-14 rounded-xl text-lg mb-3">
                  <Link href="/decks">My profile →</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={startNewSet}
                  className="w-full h-14 rounded-xl text-lg mb-7 dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                  Create a new set
                </Button>
                <button
                  type="button"
                  onClick={() => setSurvivalPicker(true)}
                  className="w-full text-center text-lg text-muted-foreground hover:text-foreground dark:text-white/60 dark:hover:text-white/90">
                  Don&apos;t know where to start? Try a <span className="font-semibold text-primary dark:text-[#A5B4FC]">survival guide</span> →
                </button>
              </>
            ) : (
              <>
                <h1 className="font-display text-5xl sm:text-6xl font-medium mb-5 text-foreground dark:text-white">Let&apos;s personalise your Spanish</h1>
                <p className="text-muted-foreground dark:text-white/60 text-lg mb-10">Six quick questions so we can build a vocabulary set that matches your life.</p>
                <Button asChild className="w-full h-14 rounded-xl text-lg mb-3">
                  <Link href="/login?next=/&mode=signup">Get started</Link>
                </Button>
                <p className="text-base text-muted-foreground dark:text-white/60 text-center">
                  Already have an account?{' '}
                  <Link href="/login?next=/" className="font-medium text-primary hover:underline dark:text-[#A5B4FC]">Log in</Link>
                </p>
                <p className="mt-7 text-center text-sm text-muted-foreground/70 dark:text-white/40">
                  <Link href="/philosophy" className="hover:text-foreground dark:hover:text-white/70">Why LingoRewired? →</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-muted/40 p-4 sm:p-6 ${step === 8 ? 'dark:bg-[#0f1442]' : ''}`}>
      <div className={`rounded-2xl p-6 sm:p-8 w-full transition-[max-width] ${step === 8 ? 'bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10 dark:bg-transparent dark:text-white dark:shadow-none dark:ring-0 dark:rounded-none dark:p-0' : 'bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10'} ${step === 8 && viewMode === 'list' ? 'max-w-2xl' : 'max-w-md'}`}>

        {calibrating ? (
          <Calibration
            selfLevel={answers.level}
            levelOptions={LEVEL_OPTIONS}
            onComplete={handleCalibrationComplete}
            onSkip={handleCalibrationSkip}
          />
        ) : survivalPicker ? (
          <SurvivalGuidePicker
            guides={SURVIVAL_GUIDES}
            loading={saving}
            onSelect={startSurvivalGuide}
            onBack={() => setSurvivalPicker(false)}
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

        {/* Step 1 — Level */}
        {step === 1 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Step 1 of 6</p>
            <h2 className="text-xl font-semibold mb-1 text-foreground">What&apos;s your current level?</h2>
            <p className="text-muted-foreground text-sm mb-6">Be honest — we&apos;ll pitch the words at the right difficulty.</p>
            <ChipGroup type="single" options={LEVEL_OPTIONS} value={answers.level} onChange={v => selectOne('level', v)} />
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => goBack(0)} className="text-muted-foreground">Back</Button>
              <Button onClick={() => goNext(2)} disabled={!answers.level} className="rounded-xl">{editReturn ? 'Done' : 'Continue'}</Button>
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
                    className="group flex items-center gap-1.5 text-left min-w-0">
                    <span className="text-foreground font-medium">{value || '—'}</span>
                    <Pencil className="size-3 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>

            {/* Optional formality control — no dedicated step, since it's a
                simple binary choice that defaults to no preference (blank =
                unchanged generation behavior) rather than adding friction to
                every learner's onboarding. */}
            <div className="mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Formality (optional)</p>
              <ChipGroup
                type="single"
                options={REGISTER_OPTIONS}
                value={answers.register}
                onChange={v => selectOne('register', v)}
                descriptions={REGISTER_DESCRIPTIONS}
              />
              <p className="text-xs text-muted-foreground -mt-2">
                Not sure? <span className="text-foreground">tú</span> is casual (friends, family); <span className="text-foreground">usted</span> is polite (strangers, work).
              </p>
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
              <h2 className="text-xl font-semibold text-foreground dark:text-white">Your vocabulary set</h2>
              <Link href="/decks" className="text-sm font-medium text-primary dark:text-[#A5B4FC] hover:underline shrink-0">My decks →</Link>
            </div>
            <p className="text-muted-foreground dark:text-white/60 text-sm mb-4">Personalised for you — start learning.</p>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button variant="outline" onClick={() => setStep(0)} className="rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                Start over
              </Button>
              <Button onClick={() => addMoreWords()} disabled={loading || !savedDeckId} className="rounded-xl">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? 'Adding...' : '+ Add 6 more words'}
              </Button>
              <Button
                variant="outline"
                onClick={() => exportDeckPdf(defaultDeckName(), words)}
                className="rounded-xl sm:w-auto dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
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

            {/* The deck saves itself automatically as soon as words are
                generated — no separate "save" step, so review and every
                other deck feature are available right away. */}
            <div className="mb-4">
              {savedDeckId ? (
                <Alert className="dark:bg-transparent dark:border dark:border-white/15">
                  <AlertDescription className="flex items-center justify-between gap-2 dark:text-white/70">
                    <span>Saved to your decks.</span>
                    <Link href={`/review/${savedDeckId}`} className="font-medium text-primary dark:text-[#A5B4FC] hover:underline shrink-0">Review now →</Link>
                  </AlertDescription>
                </Alert>
              ) : saveError ? (
                <Alert variant="destructive" className="dark:bg-transparent dark:border dark:border-red-400/30">
                  <AlertDescription className="flex items-center justify-between gap-2">
                    <span>{saveError}</span>
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => createDeck(answers, words)} className="shrink-0 rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-muted-foreground dark:text-white/60 flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" /> Saving to your decks…
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4 dark:bg-transparent dark:border dark:border-red-400/30">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Mode toggle + pronunciation dialect */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <Tabs value={viewMode} onValueChange={setViewMode} className="shrink-0">
                <TabsList className="grid grid-cols-2 w-full sm:w-72 dark:bg-white/10">
                  <TabsTrigger value="flashcard" className="dark:text-white/70 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white">Flashcards</TabsTrigger>
                  <TabsTrigger value="list" className="dark:text-white/70 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white">List</TabsTrigger>
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
                {cardIndex >= activeOrder.length ? (
                <div className="text-center py-4">
                  <PartyPopper className="mx-auto mb-2 size-10 text-primary dark:text-[#A5B4FC]" />
                  <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1">Batch complete!</h3>
                  <p className="text-muted-foreground dark:text-white/60 text-sm mb-6">You reviewed all {activeOrder.length} words.</p>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    {weakIndices.length > 0 ? (
                      <Button variant="outline" onClick={reviewAgain} className="flex-1 rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                        Review again — hardest first
                      </Button>
                    ) : (
                      <p className="flex-1 flex items-center justify-center text-sm text-muted-foreground dark:text-white/60 border border-dashed border-border dark:border-white/20 rounded-xl px-4 py-2">
                        You know every word here 🎉
                      </p>
                    )}
                    <Button onClick={() => setViewMode('list')} className="flex-1 rounded-xl">
                      View as list
                    </Button>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border dark:border-white/10 text-left">
                    <p className="text-xs text-muted-foreground dark:text-white/50 uppercase tracking-widest mb-3">Suggested next topics</p>
                    {suggestions.length > 0 ? (
                      <>
                        <SuggestionsList suggestions={suggestions} onSelect={(topic) => addMoreWords(topic)} loading={loading} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateSuggestions(answers, words)}
                          disabled={suggestionsLoading}
                          className="mt-3 text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white dark:hover:bg-white/10">
                          {suggestionsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                          {suggestionsLoading ? 'Thinking of topics...' : 'Suggest more topics'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateSuggestions(answers, words)}
                        disabled={suggestionsLoading}
                        className="rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                        {suggestionsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                        {suggestionsLoading ? 'Thinking of topics...' : 'Suggest topics'}
                      </Button>
                    )}
                    {/* Feedback right where the tap happened — the topic
                        grid can be scrolled far from the top-of-screen
                        progress bar, so without this a click here looked
                        like it did nothing while the ~10s call ran. */}
                    {loading && <div className="mt-4"><GenerationProgress message="Generating more words…" /></div>}
                  </div>
                </div>
              ) : (
                <div>
                  {currentCard && (
                    <div className="flashcard-scene h-64 mb-4">
                      <div
                        onClick={() => setCardFlipped(f => !f)}
                        className={`flashcard relative w-full h-full cursor-pointer ${cardFlipped ? 'is-flipped' : ''}`}>
                        <div className="flashcard-face absolute inset-0 rounded-2xl border border-slate-200 bg-white shadow-md p-6 flex flex-col items-center justify-center text-center">
                          <Badge variant="outline" className={`mb-4 ${tierInfo(currentCard.tier).badgeClass}`}>
                            {tierInfo(currentCard.tier).label}
                          </Badge>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-2xl font-semibold text-slate-900">{currentCard.word}</span>
                            <SpeakButton text={currentCard.word} gender={voiceGender} />
                          </div>
                          <span className="text-sm text-slate-500 italic">{currentCard.part_of_speech}</span>
                          <span className="text-xs text-slate-400 mt-6">Tap to reveal</span>
                        </div>
                        <div className="flashcard-face flashcard-face-back absolute inset-0 rounded-2xl border border-primary/20 bg-white shadow-md p-6 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-semibold text-slate-900 mb-1">{currentCard.translation}</span>
                          <span className="text-xs text-slate-500 italic mb-4">{currentCard.part_of_speech}</span>
                          <div className="flex items-start gap-1">
                            <span className="text-sm text-slate-700 italic">{currentCard.example}</span>
                            <SpeakButton text={currentCard.example} gender={voiceGender} className="shrink-0 -mt-1" />
                          </div>
                          <span className="text-xs text-slate-500 italic mt-1">{currentCard.example_translation}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {cardFlipped && (
                    <div className="flex gap-2 mb-3">
                      <Button variant="outline" onClick={() => rateCard('learning')} className="flex-1 rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                        Still learning
                      </Button>
                      <Button onClick={() => rateCard('easy')} className="flex-1 rounded-xl">
                        Got it!
                      </Button>
                    </div>
                  )}
                  <Progress value={(cardIndex / activeOrder.length) * 100} className="mb-3 dark:bg-white/10" />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCardFlipped(false); setCardIndex(i => Math.max(i - 1, 0)) }}
                      disabled={cardIndex === 0}
                      className="text-muted-foreground dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10">
                      ← Prev
                    </Button>
                    <span className="text-xs text-muted-foreground dark:text-white/50">{cardIndex + 1} / {activeOrder.length}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCardFlipped(false); setCardIndex(i => Math.min(i + 1, activeOrder.length)) }}
                      className="text-primary hover:text-primary dark:text-[#A5B4FC] dark:hover:text-[#A5B4FC] dark:hover:bg-white/10">
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
                    <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-semibold text-slate-900">{w.word}</span>
                          <SpeakButton text={w.word} gender={voiceGender} />
                          <span className="text-[11px] text-slate-500 italic">{w.part_of_speech}</span>
                        </div>
                        <TierBadge tier={w.tier} />
                      </div>
                      <div className="text-sm text-slate-500 mb-2">{w.translation}</div>
                      <div className="text-sm text-slate-700 border-l-2 border-slate-200 pl-3 italic mb-1">{w.example}</div>
                      <div className="text-sm text-slate-500 border-l-2 border-slate-200 pl-3 italic">{w.example_translation}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-border dark:border-white/10">
                  <p className="text-xs text-muted-foreground dark:text-white/50 uppercase tracking-widest mb-3">Suggested next topics</p>
                  {suggestions.length > 0 ? (
                    <>
                      <SuggestionsList suggestions={suggestions} onSelect={(topic) => addMoreWords(topic)} loading={loading} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateSuggestions(answers, words)}
                        disabled={suggestionsLoading}
                        className="mt-3 text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white dark:hover:bg-white/10">
                        {suggestionsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                        {suggestionsLoading ? 'Thinking of topics...' : 'Suggest more topics'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateSuggestions(answers, words)}
                      disabled={suggestionsLoading}
                      className="rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                      {suggestionsLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                      {suggestionsLoading ? 'Thinking of topics...' : 'Suggest topics'}
                    </Button>
                  )}
                  {loading && <div className="mt-4"><GenerationProgress message="Generating more words…" /></div>}
                </div>
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
