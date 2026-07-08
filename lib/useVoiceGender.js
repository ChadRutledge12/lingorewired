'use client'
import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'lingorewired:voiceGender'
const DEFAULT_GENDER = 'female'

// localStorage's native 'storage' event only fires in *other* tabs, not the
// one that made the change — dispatch it manually so this tab's subscribers
// (and useSyncExternalStore) notice the update too.
function notify() {
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
}

function subscribe(callback) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY)
}

// Server (and the very first client render, pre-hydration) never has a
// stored preference — returning the same value in both keeps SSR and the
// initial client render identical, avoiding a hydration mismatch.
function getServerSnapshot() {
  return null
}

// Tracks the user's preferred pronunciation voice gender, persisted in
// localStorage so it applies across the generator, saved decks, and future
// visits.
export function useVoiceGender() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setGender = useCallback((next) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    notify()
  }, [])

  return { gender: stored || DEFAULT_GENDER, setGender }
}
