import { createClient } from '@/lib/supabase/server'
import { callClaudeForJson, normalizeWord } from '@/lib/wordGeneration'
import { buildReadingPrompt, pickReadingTargets, READING_LENGTHS } from '@/lib/readingGeneration'

// Attach the originating card id to each generated target (best-effort, via
// normalized-word match) so the reading view can offer to review the exact
// words the learner looked up. Mutates the sentences in place.
function linkTargetsToCards(sentences, targets) {
  const byKey = new Map(targets.map((t) => [normalizeWord(t.word), t.id]))
  for (const s of sentences) {
    for (const t of s.targets || []) {
      const id = byKey.get(normalizeWord(t.surface))
      if (id) t.cardId = id
    }
  }
}

// Generate a reading from a deck's vocabulary (or continue an existing one)
// and save it. Body: { scenario?, length?, continueReadingId? }.
export async function POST(request, { params }) {
  const { deckId } = await params
  const { scenario, length, continueReadingId } = await request.json().catch(() => ({}))
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
    .select('id, word, translation, due')
    .eq('deck_id', deckId)
  if (!cards || cards.length === 0) {
    return Response.json({ error: 'Add some words to this deck first' }, { status: 400 })
  }

  // Continuation: load the existing reading and feed its text back in.
  let existing = null
  if (continueReadingId) {
    const { data } = await supabase
      .from('readings')
      .select('id, scenario, content')
      .eq('id', continueReadingId)
      .single()
    if (!data) {
      return Response.json({ error: 'Reading not found' }, { status: 404 })
    }
    existing = data
  }

  const targets = pickReadingTargets(cards, new Date().toISOString())
  const safeLength = READING_LENGTHS[length] ? length : 'short'
  const previousText = existing?.content?.sentences?.map((s) => s.es).join(' ')
  const prompt = buildReadingPrompt(targets, {
    profile: deck.profile,
    scenario: scenario || existing?.scenario,
    length: safeLength,
    previousText,
  })

  let reading
  try {
    reading = await callClaudeForJson(prompt, 2500)
  } catch (err) {
    // Anthropic's own 401/403 must not be forwarded as-is — the client
    // treats a 401 from this endpoint as "you're logged out" and redirects
    // to /login, which is wrong when it's actually an upstream key/auth issue.
    const status = err.status === 401 || err.status === 403 ? 502 : err.status || 500
    return Response.json({ error: err.message }, { status })
  }

  if (!reading?.title || !Array.isArray(reading.sentences) || reading.sentences.length === 0) {
    return Response.json({ error: 'The reading came back malformed — please try again.' }, { status: 502 })
  }

  linkTargetsToCards(reading.sentences, targets)

  // Continuation appends to the existing reading; a fresh reading inserts.
  if (existing) {
    const merged = [...(existing.content.sentences || []), ...reading.sentences]
    const sourceCardIds = [...new Set(merged.flatMap((s) => (s.targets || []).map((t) => t.cardId).filter(Boolean)))]
    const { error } = await supabase
      .from('readings')
      .update({ content: { sentences: merged, sourceCardIds } })
      .eq('id', existing.id)
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ readingId: existing.id })
  }

  const sourceCardIds = [...new Set(reading.sentences.flatMap((s) => (s.targets || []).map((t) => t.cardId).filter(Boolean)))]
  const { data: saved, error } = await supabase
    .from('readings')
    .insert({
      deck_id: deckId,
      user_id: user.id,
      title: reading.title,
      scenario: (scenario || '').trim() || null,
      content: { sentences: reading.sentences, sourceCardIds },
    })
    .select('id')
    .single()
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ readingId: saved.id })
}
