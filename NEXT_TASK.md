# NEXT_TASK

## Immediate: finish, verify, and commit placement calibration

Status: **uncommitted, wired end-to-end, not yet browser-tested.** `git status` shows `M app/HomeClient.js`, plus new `components/Calibration.js` and `lib/calibrationWords.js`.

What it does: before the *first* word generation in onboarding, show a quick placement screen — the learner taps every word they recognize from a fixed CEFR-banded list (`lib/calibrationWords.js`), `estimateLevel()` guesses their level from which bands they clear, they confirm/override it, then generation runs with their self-reported level replaced by the calibrated one and the tapped words folded into `existingWords` (so the set doesn't re-teach words they already know).

Flow as wired: `HomeClient.js`'s "Generate my words" button now calls `beginCalibration()` instead of `generateWords()` directly → renders `<Calibration>` → `onComplete` fires `handleCalibrationComplete` (merges calibrated level into `answers`, stores `knownWords`, calls `generateWords({...answers, knownWords})`) or `onSkip` fires `handleCalibrationSkip` (skips straight to `generateWords()` with no known words). `generateWords()` strips `knownWords` back out of the payload and folds it into the `existingWords` string the API already expects — `/api/generate-words` needed no changes.

**To do:**
1. Run the dev server, go through onboarding to the generate step, confirm the Calibration screen renders and the word chips are tappable.
2. Tap a few words from a known band (e.g. the A2 row in `CALIBRATION_BANDS`) and confirm the estimate lands on that level, and that overriding the suggested level via the chip row works.
3. Confirm "Skip for now" still generates a set with the old (self-reported step) behavior.
4. Confirm the generated set avoids the tapped known words (check the request payload or resulting word list).
5. Confirm calibration does **not** re-trigger on "Add more" (step 8) or on picking a suggested topic — those should still call `generateWords()` directly, per the comment in `HomeClient.js` above `beginCalibration`.
6. Confirm the returning-user "Create a new set" cumulative flow (prefilled from the last deck's profile) still reaches calibration correctly rather than skipping it.
7. If all of the above check out: `git add app/HomeClient.js components/Calibration.js lib/calibrationWords.js` and commit.

## After that — condensed backlog, roughly in priority order

1. **Habit loop** — daily goal, return reminder (Resend is already wired for transactional email), streak freeze. Biggest open retention gap; the app currently has no return mechanism at all.
2. **Daily new-card cap** — no cap today, so learners can over-generate and bury themselves in due cards (the #1 stated reason Anki users quit).
3. **Paste-text → vocab extraction** — paste an authentic document/article, AI extracts hard words + glosses into a deck. Strong fit for the professional/expat/heritage-speaker segments this app suits best.
4. **Contextual cloze** — cache multiple AI-generated example-sentence variants per card (same cache-once pattern as `cards.related_words`), so Cloze mode isn't limited to the single stored `example` sentence. Foundation for progressive/grammar-aware cloze later.
5. **Dialect trust badge** — generation already enforces dialect (`dialectGuidance()`), but there's no visible "Spain Spanish" / country badge in the UI confirming it to the learner.
6. **Native-quality AI voice** — replace/augment the browser Web Speech API, which varies in quality by device.
7. **Grammar-synthesis layer** — the long-term "method" bet (see `app/philosophy/page.js`). Don't start until the open sequencing fork in DECISIONS.md is resolved with the user.
