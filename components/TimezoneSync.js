'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Records the visitor's IANA time zone in a `tz` cookie so server-rendered
// stats (streak, reviews-today) can bucket days by the learner's local
// midnight instead of UTC. On the first-ever visit — or after the learner
// travels to a new zone — the cookie changes and we refresh so the server
// re-renders with the correct zone; otherwise this is a no-op. Renders nothing.
export default function TimezoneSync() {
  const router = useRouter()
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!tz) return
      const current = document.cookie
        .split('; ')
        .find((c) => c.startsWith('tz='))
        ?.slice(3)
      if (current !== tz) {
        document.cookie = `tz=${tz}; path=/; max-age=31536000; SameSite=Lax`
        router.refresh()
      }
    } catch {
      // Intl unavailable or cookies blocked — server just falls back to UTC.
    }
  }, [router])
  return null
}
