import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReadingClient from './ReadingClient'

export const dynamic = 'force-dynamic'

export default async function ReadingPage({ params }) {
  const { readingId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/readings/${readingId}`)

  // RLS already scopes this to the owner; a miss means not found / not yours.
  const { data: reading } = await supabase
    .from('readings')
    .select('id, deck_id, title, scenario, content')
    .eq('id', readingId)
    .single()
  if (!reading) notFound()

  const { data: deck } = await supabase.from('decks').select('name').eq('id', reading.deck_id).single()

  return <ReadingClient reading={reading} deckName={deck?.name} />
}
