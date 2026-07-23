import { createClient } from '@/lib/supabase/server'
import { normalizeProfile } from '@/lib/learningProfile'

// Replace the current user's canonical learning profile. Whole-object PUT
// rather than a field patch: the settings form always submits the complete
// profile, and a partial merge would make "I cleared all my interests"
// indistinguishable from "I didn't touch interests".
export async function PUT(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // normalizeProfile is the whole validation story: it drops unknown keys and
  // coerces every field to its declared shape, so nothing unvetted from the
  // client reaches the jsonb column or, later, a prompt.
  const learning_profile = normalizeProfile(body)

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, learning_profile }, { onConflict: 'user_id' })
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, profile: learning_profile })
}
