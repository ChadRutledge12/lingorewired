# LingoRewired — Project Context

Personalized Spanish vocabulary + spaced-repetition study app. Generates a learner's vocabulary set from *their own life* (job, interests, goals, location/dialect) via Claude, then schedules review with real FSRS — not a fixed curriculum. Long-term direction: grow from a vocab app into a full method that teaches grammar synthesized with the vocabulary a student is actively learning (see `app/philosophy/page.js`).

See also: [DECISIONS.md](DECISIONS.md) (why things are built this way), [AI_CONTEXT.md](AI_CONTEXT.md) (Claude-generation workflows), [AI_RULES.md](AI_RULES.md) (coding conventions), [NEXT_TASK.md](NEXT_TASK.md) (what to work on now).

## Stack

- Next.js 16.2.9 (App Router), React 19.2.4
- Tailwind v4 + shadcn/ui (radix-ui primitives)
- Supabase: Postgres + auth (email/password) + Row-Level Security
- `ts-fsrs` 5.4.1 for spaced-repetition scheduling
- Anthropic API (raw `fetch`, not the SDK — see AI_CONTEXT.md) for all generation
- Browser Web Speech API for TTS (known liability — see Known limitations)
- jsPDF for deck export
- Deployed on Vercel (Hobby tier, deliberate — not yet monetized) at lingorewired.vercel.app; repo at github.com/ChadRutledge12/lingorewired
- Transactional email via Resend SMTP (custom domain `send.spanishrewired.com`) wired into Supabase Auth — do not touch root-domain MX/SPF records, they run separate email forwarding

## Data model (`supabase/schema.sql`)

- **decks** — `user_id`, `name`, `profile` jsonb (onboarding answers: level/goals/interests/contexts/location, captured at save time so Amplify can regenerate without re-asking). Null `profile` on decks saved before this column existed — generation falls back to a words-only prompt for those.
- **cards** — vocabulary content (`word`, `translation`, `part_of_speech`, `example`, `example_translation`, `tier`) + full FSRS scheduling state (`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `learning_steps`, `state`, `last_review`) + `related_words` jsonb (cached word-cloud cluster, generated once, reused forever).
- **review_logs** — append-only history of every rating, one row per review.
- **readings** — AI-generated short stories using a deck's vocab in context; `content` jsonb is `{ sentences: [{ es, en, targets: [{surface, gloss}] }] }`.
- All four tables have RLS: `auth.uid() = user_id`, enforced at the DB layer as a second check behind the API route's own auth check.

## Feature / route map

- **Onboarding** — `app/page.js` + `app/HomeClient.js`: questionnaire → Claude-generated word batch, saved as a deck immediately on generation (not after a separate save step — "Add more" and topic-picks extend the already-saved deck via the amplify endpoint). Cumulative flow (new decks prefill from the most recent deck's profile, with per-field edit). A "quick placement" calibration step (`components/Calibration.js`, `lib/calibrationWords.js`) runs before the first generation — tap known words, get a CEFR estimate, confirm/override. A 2-tap "in a hurry" fast path skips goals/interests/contexts with travel defaults for time-pressed learners.
- **`/decks`** — hub: stats dashboard (streak/retention/reviews), unified due-card queue across decks, empty-deck creation.
- **`/decks/[deckId]`** — full card list, rename, per-card edit/delete, Amplify (generate related words from stored profile), Suggest topics, Add card (manual), Download PDF, word-cloud modal (`components/WordCloud.js`) with "review this cluster."
- **`/review`** (unified) and **`/review/[deckId]`** (`ReviewClient.js`) — 5 modes via tabs: **Smart** (default — ladders exercise type by per-card mastery: New/Learning → Flip, Familiar → Cloze, Mastered → Type), Flip, Type, Listen, Cloze. Supports `?cards=id1,id2,...` to scope a session to explicit card IDs (used by "review this cluster" and `/cloud`'s practice-one-word flow), bypassing the normal due-date filter. The done screen shows a per-session rating tally (count of Again/Hard/Good/Easy) and offers "Flip through again" (replays the same loaded set, no network round-trip) alongside "See updated mastery" and "Back to decks".
- **`/cloud`** — knowledge cloud: every saved word, sized/colored by 1–4 mastery (`lib/mastery.js`), plus a 4-pip mastery meter next to each word (color alone isn't an accessible signal — see DECISIONS.md). Legend chips filter; tap a word for a flashcard modal + one-card practice session.
- **`/readings/[readingId]`** — AI story generated from a deck's due/undue vocab, extendable, target words glossed in context.
- **`/translate/[deckId]`** — English→Spanish production practice with model answers + valid alternatives.
- **`/philosophy`** — mission/vision copy (user is writing final version; current file is an AI-drafted starting point).
- **`/login`, `/reset-password`** — Supabase auth flows.

## Known limitations (current, not tracked as bugs to fix opportunistically)

- `lib/stats.js` streak is computed in UTC calendar days, not the learner's local timezone.
- `lib/normalizeWord.js` strips diminutive suffixes before plural suffixes — can over-strip (e.g. "casita" → "ca" instead of matching "casa").
- `lib/clozeBlank.js` can't locate irregular/stem-changing conjugated verbs in example sentences (e.g. "jugar" → "juegan"); falls back to a translation prompt rather than guessing wrong.
- All review modes share one FSRS difficulty/stability per card, even though recognition/production/listening/contextual recall are different skills.
- Browser Web Speech API TTS quality varies by device/browser — flagged as a future liability, not yet replaced.
- Decks saved before the `profile` column existed have no stored profile (by design, not a bug — Amplify/suggest-topics fall back to words-only prompts).

## Dev environment gotcha

Turbopack dev server occasionally serves the framework's HTML 404 page for nested dynamic API routes (e.g. `/api/cards/[cardId]/related`) that worked minutes earlier in the same session, even though `next build` lists them correctly. Fix: `rm -rf .next` + restart `npm run dev`. Confirm with the user before killing their dev-server process.
