import { createClient } from '@/lib/supabase/server'
import { loadLearningProfile } from '@/lib/serverProfile'
import {
  buildEnrichPrompt,
  callClaudeForJson,
  draftsFromChunk,
  normalizeWord,
} from '@/lib/wordGeneration'

// Words per model call. A single call for a 40-word textbook paste is one
// oversized JSON response away from a parse failure that loses the whole
// import, so we split and run the chunks in parallel: a bad chunk costs the
// learner those 12 words, not all 40.
const CHUNK_SIZE = 12
const CHUNK_MAX_TOKENS = 4000
const MAX_WORDS = 60

// Fills in complete flashcards for vocabulary the learner supplies — a pasted
// list from a textbook or class, or a single word typed into the manual add
// form. Both entry points are the same request with a different length.
//
// Returns drafts WITHOUT inserting (same contract as suggest-words): the
// learner picks the sense and reviews the generated example before anything is
// saved, and the existing bulk `POST /api/decks/[deckId]/cards` does the write.
export async function POST(request, { params }) {
  const { deckId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: deck } = await supabase
    .from('decks')
    .select('id, name, profile')
    .eq('id', deckId)
    .single()
  if (!deck) {
    return Response.json({ error: 'Deck not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))

  // An item is either a bare string ("banco" — what the manual add form
  // sends) or a { word, translation } pair from a two-column paste. Either
  // field may hold the Spanish or the English; the prompt sorts that out, so
  // here we only collect the non-empty strings the learner actually typed.
  const items = []
  const seen = new Set()
  for (const raw of Array.isArray(body.words) ? body.words : []) {
    const given = (typeof raw === 'string' ? [raw] : [raw?.word, raw?.translation])
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
      .slice(0, 2)
    if (given.length === 0) continue
    const key = given.join('|').toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ given, label: given.join(' — ') })
  }

  if (items.length === 0) {
    return Response.json({ error: 'No words to enrich' }, { status: 400 })
  }
  if (items.length > MAX_WORDS) {
    return Response.json(
      { error: `Too many words at once — ${MAX_WORDS} is the maximum, you pasted ${items.length}.` },
      { status: 400 }
    )
  }

  // Prefer the learner's live profile over the deck's creation-time snapshot,
  // so an import honours the dialect and register they want TODAY. Without
  // this an imported card lands in Latin American Spanish in a deck the
  // learner has since switched to Castilian.
  const profile = (await loadLearningProfile(user.id)) || deck.profile || null

  const { data: existingCards } = await supabase.from('cards').select('word').eq('deck_id', deckId)
  const existingWordList = (existingCards || []).map((c) => c.word)
  const existingNormalized = new Set(existingWordList.map(normalizeWord))

  const chunks = []
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE))
  }

  const settled = await Promise.allSettled(
    chunks.map((chunk) =>
      callClaudeForJson(
        buildEnrichPrompt(chunk, {
          profile,
          deckName: deck.name,
          deckWords: existingWordList,
        }),
        CHUNK_MAX_TOKENS
      )
    )
  )

  // Every chunk failing means the model call itself is broken (bad key, rate
  // limit, upstream outage) — that is an error, not a 200 with an empty body.
  // A partial failure is not: the learner keeps the words that came back and
  // can retry the rest.
  if (settled.every((r) => r.status === 'rejected')) {
    const err = settled[0].reason
    // Anthropic's own 401/403 must not be forwarded as-is — the client treats
    // a 401 from this endpoint as "you're logged out" and redirects to
    // /login, which is wrong when it's actually an upstream key/auth issue.
    const status = err?.status === 401 || err?.status === 403 ? 502 : err?.status || 500
    return Response.json({ error: err?.message || 'Failed to enrich words' }, { status })
  }

  const isDuplicate = (word) => existingNormalized.has(normalizeWord(word))
  const drafts = []
  const failed = []

  settled.forEach((result, chunkIndex) => {
    const chunk = chunks[chunkIndex]
    if (result.status === 'rejected') {
      failed.push(...chunk.map((item) => item.label))
      return
    }
    const merged = draftsFromChunk(chunk, result.value?.items, isDuplicate)
    drafts.push(...merged.drafts)
    failed.push(...merged.failed)
  })

  return Response.json({ drafts, failed })
}
