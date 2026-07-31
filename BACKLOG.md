# LingoRewired — Backlog & Daily Sprint

Single source of truth for what's left to build. **LR** = LingoRewired; the number is
just a stable ID so we can say "work LR-10" instead of describing the task again.

- **Pri** — P1 = do next, P2 = should do, P3 = someday / nice to have
- **Est** — S = under an hour, M = a session, L = multi-session, XL = a project
- **Status** — `open` · `blocked` · `in progress` · `shipped` · `scrapped`

Keep this file current: when something ships, mark it `shipped` with the commit SHA.
The daily sprint routine reads this file, so a stale entry means a stale reminder.

---

## 🎯 Today's sprint

Pick from here first. Three slots, deliberately: one quick win, one real feature,
one thing you can do without me.

| Slot | Item | Why it's here |
|---|---|---|
| **Quick win (S/M)** | LR-22 — Settings "✓ Saved" pill shows before any edit | Small, isolated, visible. Good warm-up task. |
| **Main build (M/L)** | LR-33 — Import UI for the enrich endpoint | Backend is already written and tested; this is the half that makes it real. |
| **Yours, no code** | LR-24 — add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` | Blocks local cron/admin testing. Five minutes in the Supabase dashboard. |

**Also open, awaiting your word:** LR-30 (rework the level/placement test) needs a
talk-through with you before anyone writes code.

---

## 🧩 Epic A — Cloze & card types

| ID | Task | Why | Pri | Est | Status | Done when |
|---|---|---|---|---|---|---|
| LR-1 | **Contextual cloze: cache AI sentence variants per card** | Foundation that unlocks the whole cloze roadmap | P1 | L | open | New `cards.sentences` jsonb; generated once, reused; a card drills across ≥3 contexts |
| LR-2 | Progressive cloze (pick sentence by mastery) | Desirable difficulty grows with the learner | P2 | M | open (needs LR-1) | Low mastery gets a simple sentence, high gets a complex one |
| LR-3 | Grammar-aware cloze (blank a conjugation/article/prep) | Reinforces grammar, not just vocab | P2 | M | open (needs LR-1) | AI marks which token to blank; ≥1 grammar-blank type live |
| LR-4 | Confusable-pair drills (ser/estar, por/para, saber/conocer) | The classic intermediate plateau | P2 | M | open | A drill card type that contrasts a confusable pair with feedback |
| LR-5 | Synonym/register disambiguation card (pedir vs preguntar) | Advanced-tail need; deferred once already | P3 | L | open | New card type contrasting near-synonyms by register/meaning |

## ✨ Epic B — Personalization & trust

| ID | Task | Why | Pri | Est | Status | Done when |
|---|---|---|---|---|---|---|
| LR-6 | "Why this word" rationale line | "Added *mancuerna* because you lift" — turns the silent algorithm into delight | P1 | S | scrapped (started, reverted) | Each generated word shows a one-line reason tied to the profile |
| LR-8 | Apply `dialectGuidance` to *all* generators + trust badge | Only the main generator enforces dialect today | P2 | M | open | Words-only / title / readings / translate all honor dialect; a visible "Spain Spanish" badge |
| LR-9 | Raise level ceiling to C1/C2 + receptive-vs-productive toggle | One static level fails heritage / false-beginner / C1+ learners | P3 | L | open | Level supports C1/C2; per-card "I know this, test production" option |
| LR-30 | **Rework the level/placement test** | Current calibration screen is too lightweight to trust | P2 | M | open — needs a talk-through with you first | Agreed design, then built |

## 🔁 Epic C — Habit loop & retention

| ID | Task | Why | Pri | Est | Status | Done when |
|---|---|---|---|---|---|---|
| LR-10 | **Daily new-card cap** | No cap today → learners bury themselves in due cards (the #1 Anki-quit reason) | P1 | M | open | Configurable new-cards/day limit enforced in generation + review intake |
| LR-11 | Goal-framed progress (toward a target, not raw counts) | Motivation framing | P2 | S | open | Stats/tiles read as progress toward a goal |
| LR-12 | Habit loop deploy (streak freeze + reminder emails) | — | — | — | owned by the parallel workstream — **track only, don't touch** | Their call |
| LR-19 | Streak calc uses local timezone, not UTC | Streaks broke at the wrong midnight | P1 | S | **shipped** `8dcdaeb` | — |

## 🔊 Epic D — Voice & audio

| ID | Task | Why | Pri | Est | Status | Done when |
|---|---|---|---|---|---|---|
| LR-31 | Word/passage cut-off bug | Real students were hitting it | P1 | M | **shipped** `9cf41dc` | — |
| LR-32 | "Read it slowly" / enunciation mode | Beginners need to hear each syllable | P2 | S | **shipped** `7496745` (+ `0a917e9` Read-tab pause/restart) | — |
| LR-14 | Color el/la by gender | Cheap gender-learning win (the slow-audio half of this shipped as LR-32) | P2 | S | open (half done) | Nouns tinted by article gender |
| LR-13 | **Native/neural audio** (replace browser Web Speech TTS) | Browser TTS is a real quality liability on many devices — the actual ceiling | P2 | L | open | Server-generated audio for cards/readings, cached |

## 📥 Epic E — Input & import

| ID | Task | Why | Pri | Est | Status | Done when |
|---|---|---|---|---|---|---|
| LR-7 | **Paste-text → vocab extraction** | Paste a letter/article → instant deck of the hard words | P1 | M | open | New flow: paste text → AI extracts + glosses → saveable deck |
| LR-33 | **Import UI for the enrich endpoint** | Backend (`POST /api/decks/[deckId]/enrich`) is built and tested but has no UI, so it does nothing yet | P1 | M | open — backend done, **uncommitted** | Paste box on deck detail + sense picker for ambiguous words + "✨ fill this in" on the manual add form |
| LR-15 | Reading genres beyond narrative (official letters, dialogues) | Real-world formats, esp. the immigration persona | P2 | M | open | Reading generator offers ≥2 non-story genres |
| LR-16 | Role-play dialogue exercises | Production practice in context | P3 | L | open | Interactive back-and-forth dialogue drill |
| LR-17 | Chunks / collocations & idioms layer | Fluency > isolated words | P3 | L | open | Multi-word items as a first-class card type |
| LR-18 | Phrase-first "survival kit" for true beginners | A flat 12-word list is wrong for step 0 | P3 | M | open | Beginner path seeds phrases before single words |

## 🧹 Epic F — Polish & tech debt

| ID | Task | Why | Pri | Est | Status | Done when |
|---|---|---|---|---|---|---|
| LR-20 | `normalizeWord` diminutive over-stripping ("casita" → "ca") | Dedup/matching edge case | P3 | S | open | Suffix order fixed; regression test added |
| LR-21 | Consolidate the button-heavy deck-detail page ("Grow" vs "Practice") | UX is getting crowded | P2 | M | open | Actions grouped into two clear intents |
| LR-22 | Settings "✓ Saved" pill shows on first load before any edit | Minor UX oddity | P3 | S | open | Pill only appears after an actual save |
| LR-23 | Backfill legacy decks missing a profile from the canonical profile | A canonical profile now exists | P3 | S | open | Amplify uses the canonical profile for old profile-less decks |

## 🙋 Epic G — Yours (no code from me)

| ID | Task | Why | Pri | Est | Status | Done when |
|---|---|---|---|---|---|---|
| LR-24 | Add `SUPABASE_SERVICE_ROLE_KEY` to local `.env.local` | Cron/unsubscribe admin features can't run locally without it | P2 | S | open | Key present locally; admin client works |
| LR-25 | Delete the leftover empty "Travel Vocabulary" test deck | Cruft in your live account | P3 | S | open | Deck removed from Your Decks |
| LR-26 | Swap in your rewritten `/philosophy` copy | Waiting on your version — my draft is a placeholder | P2 | S | blocked on you | Your text live on the page |
| LR-34 | Real-email signup click-through, end to end | Never tested with a real inbox | P2 | S | open | Sign up with a real address, click the confirm link, land logged in |

## 🚀 Epic H — Big bets (not soon)

| ID | Task | Why | Pri | Est | Status |
|---|---|---|---|---|---|
| LR-27 | Offline / PWA (local-first review queue + sync) | Commuter / spotty-connection persona; a real architecture project | P3 | XL | open |
| LR-28 | Payments / monetization | When you flip to paid | P3 | XL | open |
| LR-29 | Teacher dashboard | New audience | P3 | XL | open |
| LR-35 | Grammar-synthesis layer | The long-term "method" bet (see `app/philosophy/page.js`) | P3 | XL | blocked — the sequencing fork in `DECISIONS.md` needs resolving with you first |

---

## Known blockers to check before starting anything

- **Wedged `next dev` on port 3000.** Next refuses to start a second dev server for the
  same directory, so `preview_start` silently dies and live verification is impossible.
  I can't kill a process I didn't start — you run `kill <PID>`. Check this *first*
  whenever a preview won't come up.
- **Never create a git worktree under `app/`.** Next's app router scans it as routes and
  the build breaks outright.
- **A parallel session may own files in this repo.** Check `git status` before staging,
  and stage only your own files.
