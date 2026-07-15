import { createClient } from '@/lib/supabase/server'
import { newCardFields } from '@/lib/fsrs'
import { buildProfilePrompt, buildWordsOnlyPrompt, callClaudeForWords, normalizeWord } from '@/lib/wordGeneration'

const AMPLIFY_COUNT = 6

// Generate more words for an already-saved deck, related to what's already
// in it. Uses the deck's stored onboarding profile when available (full
// context: level, goals, interests...); falls back to a words-only prompt
// for decks saved before that column existed. An optional `topic` in the
// body (from picking a suggested next topic) steers generation toward that
// topic specifically instead of a generic extension.
export async function POST(request, { params }) {
  const { deckId } = await params
  const { topic } = await request.json().catch(() => ({}))
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

  const { data: existingCards } = await supabase.from('cards').select('word').eq('deck_id', deckId)
  const existingWordList = (existingCards || []).map((c) => c.word)
  const existingWordsText = existingWordList.join(', ')

  const profileForPrompt = deck.profile && topic
    ? { ...deck.profile, interests: [...(deck.profile.interests || []), topic] }
    : deck.profile

  const prompt = profileForPrompt
    ? buildProfilePrompt(profileForPrompt, AMPLIFY_COUNT, existingWordsText)
    : buildWordsOnlyPrompt(existingWordsText, AMPLIFY_COUNT, topic)

  let words
  try {
    words = await callClaudeForWords(prompt)
  } catch (err) {
    // Anthropic's own 401/403 must not be forwarded as-is — the client
    // treats a 401 from this endpoint as "you're logged out" and redirects
    // to /login, which is wrong when it's actually an upstream key/auth issue.
    const status = err.status === 401 || err.status === 403 ? 502 : err.status || 500
    return Response.json({ error: err.message }, { status })
  }

  // Belt-and-suspenders dedup against what's already in the deck, in case
  // the model repeats something despite being told not to.
  const existingNormalized = new Set(existingWordList.map(normalizeWord))
  const filtered = words.filter((w) => !existingNormalized.has(normalizeWord(w.word)))

  if (filtered.length === 0) {
    return Response.json({ cards: [] })
  }

  const now = new Date()
  const rows = filtered.map((w) => ({
    deck_id: deckId,
    user_id: user.id,
    word: w.word,
    translation: w.translation ?? null,
    part_of_speech: w.part_of_speech ?? null,
    example: w.example ?? null,
    example_translation: w.example_translation ?? null,
    tier: w.tier ?? null,
    ...newCardFields(now),
  }))

  const { data: inserted, error: insertErr } = await supabase.from('cards').insert(rows).select()
  if (insertErr) {
    return Response.json({ error: insertErr.message }, { status: 500 })
  }

  return Response.json({ cards: inserted })
}
