# NEXT_TASK

## Status: no immediate task queued

The last three shipped features were all tested live in-browser and committed:

- **Placement calibration** (`components/Calibration.js`, `lib/calibrationWords.js`) — tap-known-words step before first generation. Verified: chip rendering, level estimate + override, Skip path, known-word exclusion from the generated set, no re-trigger on "Add more"/topic-pick, returning-user flow reaches it correctly.
- **Colorblind-safe mastery pips** (`app/cloud/CloudClient.js`) + **fast-path onboarding** (`app/HomeClient.js`) — shipped alongside calibration in the same commit, not independently re-tested here.
- **Auto-save on generate** (`app/HomeClient.js`) — a deck is now created the moment words are generated, not after a separate save step; "Add more" and topic-picks extend the already-saved deck via the amplify endpoint. Observed working during calibration testing ("Saved to your decks." appeared immediately).
- **Review done-screen rating tally + "Flip through again"** (`app/review/[deckId]/ReviewClient.js`) — verified live: rated a 17-card session across all four buttons, the tally's counts matched exactly (2 Again / 3 Hard / 7 Good / 5 Easy), and "Flip through again" correctly reset to card 1 of the same set with a cleared tally.

Pick the next item from the backlog below, or wait for direction.

## Backlog, roughly in priority order

1. **Habit loop** — daily goal, return reminder (Resend is already wired for transactional email), streak freeze. Biggest open retention gap; the app still has no return mechanism.
2. **Daily new-card cap** — no cap today, so learners can over-generate and bury themselves in due cards (the #1 stated reason Anki users quit).
3. **Paste-text → vocab extraction** — paste an authentic document/article, AI extracts hard words + glosses into a deck. Strong fit for the professional/expat/heritage-speaker segments this app suits best.
4. **Contextual cloze** — cache multiple AI-generated example-sentence variants per card (same cache-once pattern as `cards.related_words`), so Cloze mode isn't limited to the single stored `example` sentence. Foundation for progressive/grammar-aware cloze later.
5. **Dialect trust badge** — generation already enforces dialect (`dialectGuidance()`), but there's no visible "Spain Spanish" / country badge in the UI confirming it to the learner.
6. **Native-quality AI voice** — replace/augment the browser Web Speech API, which varies in quality by device.
7. **Grammar-synthesis layer** — the long-term "method" bet (see `app/philosophy/page.js`). Don't start until the open sequencing fork in DECISIONS.md is resolved with the user.

## Note on concurrent sessions

During the calibration testing session (2026-07-14), a *second* Claude Code session was independently committing to this same repo at the same time (matching auto-detected git identity, so it wasn't obvious from `git log` alone) — it shipped the crash fix, calibration, mastery pips, fast-path onboarding, and auto-save commits while this session was still mid-test. If commits appear that you don't recognize authoring, check `git log` before assuming the working tree matches what you last read — it may have moved.
