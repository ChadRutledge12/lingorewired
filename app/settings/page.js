import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadLearningProfile } from '@/lib/serverProfile'
import SettingsClient from './SettingsClient'

// Depends on the auth cookie, so this can't be statically generated.
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/settings')

  const profile = await loadLearningProfile(user.id)
  return <SettingsClient user={user} profile={profile} />
}
