import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CloudClient from './CloudClient'

export const dynamic = 'force-dynamic'

// The knowledge cloud: every word the learner has saved, across all decks,
// in one view — sized and colored by how well FSRS says they know it.
export default async function CloudPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cloud')

  const [{ data: cards }, { data: decks }] = await Promise.all([
    supabase
      .from('cards')
      .select('id, deck_id, word, translation, part_of_speech, example, example_translation, state, stability, due')
      .order('created_at', { ascending: true }),
    supabase.from('decks').select('id, name'),
  ])

  const deckNames = Object.fromEntries((decks || []).map((d) => [d.id, d.name]))

  return <CloudClient cards={cards || []} deckNames={deckNames} />
}
