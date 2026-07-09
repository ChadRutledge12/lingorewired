import { createClient } from '@/lib/supabase/server'
import HomeClient from './HomeClient'

// Depends on the auth cookie, so this can't be statically generated.
export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }) {
  const { new: newParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The most recent saved profile seeds the next deck's questionnaire, so
  // returning learners edit their answers instead of re-entering them.
  let lastProfile = null
  if (user) {
    const { data } = await supabase
      .from('decks')
      .select('profile')
      .not('profile', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    lastProfile = data?.profile || null
  }

  // `?new=1` (from the dashboard's "New set") skips the welcome screen and
  // drops a logged-in learner straight into the prefilled preferences.
  return <HomeClient user={user} lastProfile={lastProfile} startNew={!!user && newParam === '1'} />
}
