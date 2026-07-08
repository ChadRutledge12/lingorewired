// Browser Supabase client — use inside Client Components ('use client').
import { createBrowserClient } from '@supabase/ssr'

// Supabase renamed the browser key to "publishable"; accept the legacy "anon"
// name too so either value from Project Settings → API works.
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_KEY)
}
