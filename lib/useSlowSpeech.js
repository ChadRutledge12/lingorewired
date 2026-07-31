'use client'
import { useCallback, useSyncExternalStore } from 'react'
import { SLOW_SPEECH_KEY } from '@/lib/speech'

// localStorage's native 'storage' event only fires in *other* tabs, not the
// one that made the change — dispatch it manually so this tab's subscribers
// (and useSyncExternalStore) notice the update too.
function notify() {
  window.dispatchEvent(new StorageEvent('storage', { key: SLOW_SPEECH_KEY }))
}

function subscribe(callback) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getSnapshot() {
  return window.localStorage.getItem(SLOW_SPEECH_KEY)
}

// Server (and the very first client render, pre-hydration) never has a stored
// preference — returning the same value in both keeps SSR and the initial
// client render identical, avoiding a hydration mismatch.
function getServerSnapshot() {
  return null
}

// Tracks whether the learner wants all Spanish audio read slowly, persisted in
// localStorage so it applies across flashcards, readings, translate and future
// visits. `lib/speech.js` reads the same key directly, so call sites that don't
// render this toggle still honor it.
export function useSlowSpeech() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setSlow = useCallback((next) => {
    window.localStorage.setItem(SLOW_SPEECH_KEY, next ? 'true' : 'false')
    notify()
  }, [])

  return { slow: stored === 'true', setSlow }
}
