import { createClient } from '@/lib/supabase/server'
import { loadLearningProfile } from '@/lib/serverProfile'
import {
  buildExtractPrompt,
  callClaudeForJson,
  draftsFromExtraction,
  normalizeWord,
  EXTRACT_MAX_CHARS,
  EXTRACT_MAX_WORDS,
} from '@/lib/wordGeneration'

// 30 cards with five fields each, plus the model restating example sentences
// from the source text, runs well past the default budget.
const MAX_TOKENS = 8000
const MIN_CHARS = 40

// Turns an authentic text the learner pasted — an official letter, an
// article, a landlord's message — into card drafts for the words worth
// learning from it.
//
// Sibling of the enrich route: that one fills in a list the learner already
// wrote, this one writes the list for them. Both return the same
// `{ drafts, failed }` shape and neither inserts anything, so they share the
// review UI and the existing bulk `POST /api/decks/[deckId]/cards`.
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
  const raw = typeof body.text === 'string' ? body.text.trim() : ''

  if (raw.length < MIN_CHARS) {
    return Response.json(
      { error: 'Paste a bit more text — a sentence or two is too little to pull vocabulary from.' },
      { status: 400 }
    )
  }

  // Truncated at a word boundary rather than refused, so a learner who pastes
  // a whole PDF still gets cards out of the opening pages.
  let text = raw
  let truncated = false
  if (text.length > EXTRACT_MAX_CHARS) {
    const cut = text.lastIndexOf(' ', EXTRACT_MAX_CHARS)
    text = text.slice(0, cut > EXTRACT_MAX_CHARS - 200 ? cut : EXTRACT_MAX_CHARS)
    truncated = true
  }

  // Today's profile, not the deck's creation-time snapshot — same reasoning as
  // the enrich route: an import should honour the dialect the learner wants
  // now.
  const profile = (await loadLearningProfile(user.id)) || deck.profile || null

  const { data: existingCards } = await supabase.from('cards').select('word').eq('deck_id', deckId)
  const existingWordList = (existingCards || []).map((c) => c.word)
  const existingNormalized = new Set(existingWordList.map(normalizeWord))

  let result
  try {
    result = await callClaudeForJson(
      buildExtractPrompt(text, {
        profile,
        deckName: deck.name,
        deckWords: existingWordList,
        limit: EXTRACT_MAX_WORDS,
      }),
      MAX_TOKENS
    )
  } catch (err) {
    // Anthropic's own 401/403 must not be forwarded as-is — the client treats
    // a 401 from this endpoint as "you're logged out" and redirects to /login,
    // which is wrong when it's actually an upstream key issue.
    const status = err?.status === 401 || err?.status === 403 ? 502 : err?.status || 500
    return Response.json({ error: err?.message || 'Failed to read that text' }, { status })
  }

  const drafts = draftsFromExtraction(
    result?.words,
    (word) => existingNormalized.has(normalizeWord(word))
  )

  // Two separate things quietly shorten the result: we read only the opening of
  // a long paste, and we cap how many words come back. A beginner hits that cap
  // on almost any real document — nearly every word is new to them — so staying
  // silent means the learner never finds out the rest of their letter was left
  // on the floor. Say it, and say what to do about it.
  const capped =
    drafts.length > 0 && (result?.more === true || drafts.length >= EXTRACT_MAX_WORDS)

  const notes = []
  if (truncated) notes.push('That text was long, so we only read the first part of it.')
  if (capped) {
    notes.push(
      `These are the ${drafts.length} most useful words in it — there are more worth learning. Add these first, then paste the text again to pick up where this left off.`
    )
  }
  // An empty result is the documented answer for "this isn't Spanish" or "this
  // is too thin to mine", so it's a 200 with an explanation rather than an
  // error the client has to guess at.
  if (drafts.length === 0) {
    notes.push(
      "Couldn't find vocabulary to pull out of that — check it's Spanish text, and long enough to have something worth learning."
    )
  }

  return Response.json({
    drafts,
    failed: [],
    truncated,
    ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
  })
}
