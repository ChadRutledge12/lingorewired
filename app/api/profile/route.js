import { createClient } from '@/lib/supabase/server'

// Update the current user's daily review goal.
export async function PATCH(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { daily_goal } = await request.json()
  if (!Number.isInteger(daily_goal) || daily_goal < 1 || daily_goal > 500) {
    return Response.json({ error: 'daily_goal must be an integer between 1 and 500' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, daily_goal }, { onConflict: 'user_id' })
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ok: true })
}
