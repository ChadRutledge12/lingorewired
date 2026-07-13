import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TranslateClient from './TranslateClient'

export const dynamic = 'force-dynamic'

export default async function TranslatePage({ params }) {
  const { deckId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/translate/${deckId}`)

  const { data: deck } = await supabase.from('decks').select('id, name').eq('id', deckId).single()
  if (!deck) notFound()

  return <TranslateClient deckId={deck.id} deckName={deck.name} />
}
