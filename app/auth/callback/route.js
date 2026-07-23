import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Where Supabase email links land: signup-confirmation and password-reset
// links both come back here to be turned into a real logged-in session before
// the user continues. Two link styles exist depending on the project's email
// templates, so we handle both:
//   - PKCE code flow:  ?code=...            -> exchangeCodeForSession
//   - token-hash flow: ?token_hash=&type=   -> verifyOtp
// On success we redirect to `next` (falling back to /decks); on failure we send
// them to /login with a friendly message rather than a blank error page.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') || '/decks'

  // Only allow same-origin relative redirects, so a crafted `next` can't bounce
  // the user off-site after authenticating.
  const dest = next.startsWith('/') ? next : '/decks'

  const supabase = await createClient()

  let error = null
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }))
  } else {
    error = new Error('missing_auth_params')
  }

  if (error) {
    const url = new URL('/login', origin)
    url.searchParams.set(
      'error',
      'That link is invalid or has expired. Please request a new one.'
    )
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(new URL(dest, origin))
}
