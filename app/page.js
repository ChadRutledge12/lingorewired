import { createClient } from '@/lib/supabase/server'
import HomeClient from './HomeClient'

// Depends on the auth cookie, so this can't be statically generated.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <HomeClient user={user} />
}
