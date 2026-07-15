import { createAdminClient } from '@/lib/supabase/admin'

function page(message) {
  return new Response(
    `<!doctype html><html><body style="font-family: -apple-system, sans-serif; text-align:center; padding: 64px 16px;">
      <p>${message}</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// One-click unsubscribe link from the reminder email. GET (not POST) is the
// standard shape for these links; the action is idempotent so an email
// client's link-prescanning can't do anything worse than an early opt-out.
export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return page('Missing unsubscribe link.')

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ reminders_enabled: false })
    .eq('unsubscribe_token', token)

  if (error) return page('Something went wrong — please try again later.')
  return page("You've been unsubscribed from LingoRewired reminder emails.")
}
