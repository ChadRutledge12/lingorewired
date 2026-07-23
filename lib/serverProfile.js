import { createClient } from '@/lib/supabase/server'
import { normalizeProfile } from '@/lib/learningProfile'

// Loads the learner's canonical profile (profiles.learning_profile).
//
// Falls back to the most recent deck's snapshot for anyone who onboarded
// before the canonical profile existed — their answers only ever lived on
// decks.profile. The fallback is read-only: it isn't written back here, since
// a GET shouldn't quietly mutate. The first save on /settings promotes it to
// the canonical row for good.
//
// Returns null when there's nothing to carry over, so callers can tell
// "no profile yet" (send them through onboarding) from "empty profile".
export async function loadLearningProfile(userId) {
  if (!userId) return null
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('profiles')
    .select('learning_profile')
    .eq('user_id', userId)
    .maybeSingle()
  if (row?.learning_profile) return normalizeProfile(row.learning_profile)

  const { data: deck } = await supabase
    .from('decks')
    .select('profile')
    .not('profile', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return deck?.profile ? normalizeProfile(deck.profile) : null
}
