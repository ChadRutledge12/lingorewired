# DECISIONS — architecture & design rationale

Durable decisions worth knowing before changing related code. Not a changelog — resolved bugs and abandoned approaches are omitted once fixed/dropped. Facts about what exists live in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md); this file is about *why*.

## Product & pedagogy

- **Personalization is generated from the learner's own life (job, interests, contexts), not pulled from a frequency list.** This is the core product thesis — see `app/philosophy/page.js`. Every generation prompt threads the learner's profile through, even the "essential" (high-frequency) tier is chosen to glue their personal words into sentences, not a generic textbook list.
- **Two vocabulary tiers (Personal/Essential), not three.** Originally `universal`/`environment`/`domain`; collapsed to two clearer learner-facing buckets in `lib/tier.js` by mapping both old "environment" and "domain" into "Personal" and "universal" into "Essential" — no DB migration needed, both schemes still coexist in the `cards.tier` column.
- **Dialect is enforced at generation time by the learner's chosen location**, not left as a generic default (`dialectGuidance()` in `lib/wordGeneration.js`). Rationale: heritage speakers, relocating professionals, and expats — the segments this app fits best — are the ones most likely to distrust vocabulary that doesn't match their actual linguistic environment.
- **Smart review mode (adaptive exercise-by-mastery) is the default**, not a flip-card default with Smart as an opt-in. New/Learning cards get Flip (recognition), Familiar gets Cloze, Mastered gets Type (production) — `smartModeFor()` in `ReviewClient.js`. Rationale: a beginner's new cards should never demand production, an advanced learner's mastered cards shouldn't stay on easy recognition — adaptive by construction beats a manual mode picker.
- **Cloze hints scale down as mastery goes up** — New/Learning cards get a `starts with "x" · N letters` hint, Familiar/Mastered get none. This is deliberate desirable-difficulty: recall should stay hard exactly when that's productive.
- **One FSRS difficulty/stability per card, shared across all review modes** (Flip/Type/Listen/Cloze), even though recognition, production, listening, and contextual recall are different cognitive skills. Known simplification — splitting it means per-mode scheduling state, a real architectural change. Don't "fix" this without the user explicitly asking for it.
- **The placement calibration word list is static and hand-curated, not AI-generated per session** (`lib/calibrationWords.js`). A placement test needs to be a consistent measuring stick; a fresh AI-generated list every run would let difficulty drift and make results incomparable. Curation rules: Spanish only (showing translations defeats the test), avoid English-cognate freebies, avoid words that diverge between Spain/Latin America dialects.
- **Manual decks and cards are fully supported alongside AI-generated ones.** Manual cards get `tier: null`; every tier badge in the UI is conditionally rendered rather than assuming a tier always exists.

## Architecture

- **Auth is required on every generation endpoint**, checked in the route handler (`supabase.auth.getUser()` → 401) in addition to RLS at the DB layer. This is a hard rule, not a style preference: an early version shipped without it and anyone with the URL could burn the shared `ANTHROPIC_API_KEY` budget with no account.
- **Prompt-building lives in `lib/*Generation.js`, never inline in route handlers** (except the single-call-site related-words endpoint). Keeps routes thin and makes prompts reusable/testable independent of the HTTP layer.
- **Deterministic backstops sit behind every AI "don't repeat X" instruction** (e.g. `dedupeSuggestions()`). LLMs are unreliable at negative instructions — never trust the prompt alone for something that needs to actually be correct.
- **Expensive per-card generations (related-words cloud) are cached once in a jsonb column and never regenerated**, not re-fetched on every view. Applies to any future "generate once, reuse forever" feature — check for an existing cache column pattern before adding a new one.
- **Streak is computed in UTC calendar days**, not per-user local timezone (`lib/stats.js`). Deliberate approximation to avoid storing/managing a timezone per user — accepted as "close enough," not silently wrong.
- **Voice selection ranks all candidate browser voices by a quality score** (network/natural/neural/premium boosted, compact/eloquence/espeak penalized) and picks the best per gender, rather than taking the first gender-matched voice the browser happens to return first. The browser's `getVoices()` ordering is arbitrary and inconsistent across devices — picking blindly can silently hand one gender a much worse voice than the other.
- **`WordCloud.js` triggers its data fetch from the click handler that opens the modal, not a mount `useEffect`.** Keeps the component purely presentational (fetch/loading/error state lives in the parent `DeckDetailClient.js`) and avoids the set-state-in-effect lint pattern. Follow this shape for future modal-triggered fetches.

## Ops & deployment

- **Vercel Hobby tier, not Pro** — deliberate, not an oversight. Monetization isn't live yet; upgrade when that changes.
- **`spanishrewired.com` (the user's existing WordPress site) is intentionally not connected to this app.** The app stays on the free `lingorewired.vercel.app` URL specifically to avoid touching the WordPress site.
- **Resend SMTP uses a `send.` subdomain, never the root domain**, because the root domain already has its own MX (email forwarding, Namecheap) and SPF record that must not be overwritten. Any future DNS/email change here must preserve that root config.

## Open forks — not yet decided

- **Grammar-synthesis sequencing** (future course layer, see `app/philosophy/page.js`): should a grammar point be introduced *because* it shows up in the learner's current vocabulary (vocab-leads-grammar), or should vocab be pulled in as examples of a traditional grammar sequence (grammar-leads-vocab)? Flagged as a real architectural fork — surface it again before starting that build, don't default silently to either direction.
