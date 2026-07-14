# AI_CONTEXT — Claude-generation workflows

How this app calls Claude, where prompts live, and the conventions for adding a new AI-generated feature. For *why* the personalization/dialect/tier choices were made, see [DECISIONS.md](DECISIONS.md).

## Calling convention

All generation goes through raw `fetch` to `https://api.anthropic.com/v1/messages` (not the Anthropic SDK), model `claude-opus-4-8`. Two shared helpers in `lib/wordGeneration.js`:

- `callClaudeForWords(prompt, maxTokens=1800)` — expects a JSON array response.
- `callClaudeForJson(prompt, maxTokens=2000)` — expects arbitrary JSON shape (object or array), used by readings/translate.

Both: strip ```` ```json ```` fences, `JSON.parse`, and throw `Error` with a `.status` property on failure (HTTP error or parse failure → 502) so every route can do the same `catch (err) { return Response.json({error: err.message}, {status: err.status || 500}) }` without duplicating logic. Every generation route requires a logged-in Supabase user (401 otherwise) — this is a hard rule, not optional, after a real incident (see DECISIONS.md).

## Where prompts live

Prompt-building is factored out of route handlers into dedicated `lib/*Generation.js` modules — routes stay thin (auth check → build prompt → call Claude → return):

- **`lib/wordGeneration.js`** — vocabulary generation. `buildProfilePrompt` (full onboarding profile), `buildTitleWordsPrompt` (empty-deck starter, seeded by deck title), `buildWordsOnlyPrompt` (fallback for profile-less decks), plus the topic-suggestion variants (`buildTopicSuggestionsPrompt`, `buildWordsOnlyTopicSuggestionsPrompt`, `buildTitleTopicSuggestionsPrompt`). Shared `WORD_FIELDS_SPEC` and `TIER_GUIDANCE` constants keep the word-shape and personal/essential weighting consistent across all variants.
- **`lib/translateGeneration.js`** — `buildTranslatePrompt`: turns target words + mastery level into English→Spanish practice sentences with model answer, valid alternatives, and a scaffold of unfamiliar words used in the answer.
- **`lib/readingGeneration.js`** — `buildReadingPrompt`: turns target words into a coherent short story, supports continuation (`previousText`) so a story can be extended rather than regenerated. `pickReadingTargets` selects which cards go in (due cards first, capped).
- **Per-word related-words cloud** — prompt lives inline in `app/api/cards/[cardId]/related/route.js` (not factored out; single call site).

## Personalization mechanics

- `buildProfilePrompt` interpolates the learner's `level`, `goals`, `interests`, `contexts`, `location` directly into the prompt, plus `dialectGuidance(location)` which turns a chosen country/region into an explicit lexis/grammar instruction (Peninsular vs. Mexican vs. Rioplatense vs. Colombian vs. generic Latin American) so word choice matches the dialect the learner actually asked for.
- Word sets are weighted ~60% "personal" (tied to the learner's own life) / 40% "essential" (high-frequency, but chosen to glue the personal words into sentences) — see `TIER_GUIDANCE` in `wordGeneration.js`. `lib/tier.js` collapses this plus a legacy 3-tier scheme (`universal`/`environment`/`domain`) down to the two learner-facing labels.
- `existingWords` is always passed to generation prompts (current deck + any calibration-known words) so the model doesn't re-teach what the learner already has.

## Reliability backstops

LLMs are unreliable at negative instructions ("don't suggest X"), so don't rely on the prompt alone for correctness-critical filtering:

- `dedupeSuggestions()` in `wordGeneration.js` — deterministic stem-based filter that drops any topic suggestion overlapping an existing word, applied *after* the Claude call.
- `lib/clozeBlank.js` — deterministic word-location logic (not AI) for building fill-in-the-blank prompts from example sentences; returns `null` on low-confidence matches rather than guessing.
- `lib/calibrationWords.js` — the placement test is a **fixed, hand-curated word list**, deliberately *not* AI-generated per session, so it's a consistent measuring stick (see DECISIONS.md).

## Caching pattern

Expensive/repeatable generations are cached in a jsonb column after first generation and never regenerated: `cards.related_words` (word-cloud cluster). `readings` are a separate table (one row per generated story, not cached-and-reused since each is a fresh continuation). Cloze sentences are **not yet cached** — cloze mode currently derives its blank from the card's existing `example` field at review time rather than a pool of pre-generated variants (this is the foundation piece of the not-yet-built contextual-cloze roadmap item).

## Adding a new AI-generated feature — the established pattern

1. Write a `buildXPrompt(...)` function in a new or existing `lib/xGeneration.js`, returning a prompt string that ends with an explicit "Return ONLY this JSON..." instruction and an exact shape.
2. Route handler: `createClient()` → `auth.getUser()` → 401 if absent → validate input shape → build prompt → `callClaudeForWords` or `callClaudeForJson` → return `{ ...data }` or `{ error }` with `err.status`.
3. If the result should persist beyond one request, cache it in jsonb on the relevant row rather than regenerating on every view.
4. If the prompt has a "don't repeat/don't include X" instruction, add a deterministic backstop filter after the call — don't trust the model alone.
