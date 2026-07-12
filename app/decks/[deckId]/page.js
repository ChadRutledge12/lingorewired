import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DeckDetailClient from './DeckDetailClient'

export const dynamic = 'force-dynamic'

export default async function DeckDetailPage({ params }) {
  const { deckId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/decks/${deckId}`)

  const { data: deck } = await supabase.from('decks').select('id, name, profile').eq('id', deckId).single()
  if (!deck) notFound()

  const [{ data: cards }, { data: readings }] = await Promise.all([
    supabase
      .from('cards')
      .select('id, word, translation, part_of_speech, example, example_translation, tier, due, state, stability, related_words')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true }),
    supabase
      .from('readings')
      .select('id, title, created_at')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false }),
  ])

  const nowIso = new Date().toISOString()
  const dueCount = (cards || []).filter((c) => c.due <= nowIso).length

  return <DeckDetailClient deck={deck} initialCards={cards || []} dueCount={dueCount} initialReadings={readings || []} />
}
