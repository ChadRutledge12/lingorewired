import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { previewIntervals, humanInterval } from '@/lib/fsrs'
import { Button } from '@/components/ui/button'
import ReviewClient from './ReviewClient'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({ params, searchParams }) {
  const { deckId } = await params
  const { cards: cardIdsParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/review/${deckId}`)

  const { data: deck } = await supabase
    .from('decks')
    .select('id, name')
    .eq('id', deckId)
    .single()
  if (!deck) notFound()

  const now = new Date()
  // An explicit card list (e.g. "Review this cluster" from the word cloud)
  // reviews exactly those cards regardless of due date, since they were just
  // created and would otherwise have to wait for their normal due date.
  const explicitIds = cardIdsParam ? cardIdsParam.split(',').filter(Boolean) : null

  const query = supabase.from('cards').select('*').eq('deck_id', deckId)
  const { data: dueCards } = explicitIds
    ? await query.in('id', explicitIds)
    : await query.lte('due', now.toISOString()).order('due', { ascending: true })

  // Slim, client-safe shape + per-card interval previews for the buttons.
  const cards = (dueCards || []).map((c) => ({
    id: c.id,
    word: c.word,
    translation: c.translation,
    part_of_speech: c.part_of_speech,
    example: c.example,
    example_translation: c.example_translation,
    tier: c.tier,
    state: c.state,
    stability: c.stability,
    intervals: previewIntervals(c, now),
  }))

  if (cards.length === 0) {
    const { data: nextCard } = await supabase
      .from('cards')
      .select('due')
      .eq('deck_id', deckId)
      .order('due', { ascending: true })
      .limit(1)
      .maybeSingle()

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 sm:p-6">
        <div className="bg-card text-card-foreground rounded-2xl shadow-sm ring-1 ring-foreground/10 p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-lg font-semibold text-foreground mb-1">All caught up</h1>
          <p className="text-sm text-muted-foreground mb-6">
            No cards are due in &ldquo;{deck.name}&rdquo; right now.
            {nextCard && <> Next review in {humanInterval(now, nextCard.due)}.</>}
          </p>
          <Button asChild className="rounded-xl">
            <Link href="/decks">Back to decks</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <ReviewClient deckId={deck.id} deckName={deck.name} initialCards={cards} />
}
