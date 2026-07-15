// Service-role Supabase client — bypasses RLS entirely. Only for server-only
// batch jobs that must see across all users (the reminder cron and the
// unsubscribe link, which have no logged-in session to scope by).
//
// IMPORTANT: unlike every other Supabase client in this codebase, queries
// through this client are NOT auto-scoped to one user by RLS — every query
// must explicitly filter by user_id. Never import this into client code or
// anything reachable without the CRON_SECRET / token checks in the routes
// that use it.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
