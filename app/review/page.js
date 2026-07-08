import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { previewIntervals, humanInterval } from '@/lib/fsrs'
import { Button } from '@/components/ui/button'
import ReviewClient from './[deckId]/ReviewClient'

export const dynamic = 'force-dynamic'

// Unified queue: due cards across every deck, in one sitting.
export default async function AllReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/review')

  const now = new Date()
  const [{ data: dueCards }, { data: decks }] = await Promise.all([
    supabase.from('cards').select('*').lte('due', now.toISOString()).order('due', { ascending: true }),
    supabase.from('decks').select('id, name'),
  ])

  const deckNameById = Object.fromEntries((decks || []).map((d) => [d.id, d.name]))

  const cards = (dueCards || []).map((c) => ({
    id: c.id,
    word: c.word,
    translation: c.translation,
    part_of_speech: c.part_of_speech,
    example: c.example,
    example_translation: c.example_translation,
    tier: c.tier,
    deckName: deckNameById[c.deck_id],
    intervals: previewIntervals(c, now),
  }))

  if (cards.length === 0) {
    const { data: nextCard } = await supabase
      .from('cards')
      .select('due')
      .order('due', { ascending: true })
      .limit(1)
      .maybeSingle()

    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4 sm:p-6">
        <div className="bg-card text-card-foreground rounded-2xl shadow-sm ring-1 ring-foreground/10 p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-lg font-semibold text-foreground mb-1">All caught up</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Nothing is due across any of your decks right now.
            {nextCard && <> Next review in {humanInterval(now, nextCard.due)}.</>}
          </p>
          <Button asChild className="rounded-xl">
            <Link href="/decks">Back to decks</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <ReviewClient deckId={null} deckName="Today's review" initialCards={cards} />
}
