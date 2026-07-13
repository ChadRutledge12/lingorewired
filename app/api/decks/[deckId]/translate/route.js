import { createClient } from '@/lib/supabase/server'
import { callClaudeForJson, normalizeWord } from '@/lib/wordGeneration'
import { pickReadingTargets } from '@/lib/readingGeneration'
import { buildTranslatePrompt } from '@/lib/translateGeneration'
import { masteryOf } from '@/lib/mastery'

// Attach the originating card id to each generated target (best-effort, via
// normalized-word match) so a correct self-assessment can feed FSRS.
function linkTargetsToCards(sentences, targets) {
  const byKey = new Map(targets.map((t) => [normalizeWord(t.word), t.id]))
  for (const s of sentences) {
    for (const t of s.targets || []) {
      const id = byKey.get(normalizeWord(t.surface))
      if (id) t.cardId = id
    }
  }
}

// Generate a fresh set of English→Spanish translation-practice sentences from
// a deck's vocabulary. Ephemeral — nothing is stored; every session is new.
export async function POST(request, { params }) {
  const { deckId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: deck } = await supabase.from('decks').select('id, profile').eq('id', deckId).single()
  if (!deck) {
    return Response.json({ error: 'Deck not found' }, { status: 404 })
  }

  const { data: cards } = await supabase
    .from('cards')
    .select('id, word, translation, due, state, stability')
    .eq('deck_id', deckId)
  if (!cards || cards.length === 0) {
    return Response.json({ error: 'Add some words to this deck first' }, { status: 400 })
  }

  // Due-first subset, tagged with a mastery label so the prompt can calibrate.
  const masteryByCard = new Map(cards.map((c) => [c.id, masteryOf(c).label]))
  const targets = pickReadingTargets(cards, new Date().toISOString()).map((t) => ({
    ...t,
    mastery: masteryByCard.get(t.id),
  }))

  let result
  try {
    result = await callClaudeForJson(buildTranslatePrompt(targets, { profile: deck.profile }), 3000)
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }

  if (!Array.isArray(result?.sentences) || result.sentences.length === 0) {
    return Response.json({ error: 'The practice set came back malformed — please try again.' }, { status: 502 })
  }

  linkTargetsToCards(result.sentences, targets)
  return Response.json({ sentences: result.sentences })
}
