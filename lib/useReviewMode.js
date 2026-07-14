'use client'
import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'lingorewired:reviewMode'
const DEFAULT_MODE = 'smart'

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

function getServerSnapshot() {
  return null
}

// Tracks whether review sessions default to flipping a flashcard or typing
// the Spanish word from recall, persisted across sessions.
export function useReviewMode() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setMode = useCallback((next) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    notify()
  }, [])

  return { mode: stored || DEFAULT_MODE, setMode }
}
