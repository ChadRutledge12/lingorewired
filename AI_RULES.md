# AI_RULES — coding conventions for this repo

Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) and [DECISIONS.md](DECISIONS.md) first for what exists and why. This file is how to write new code so it matches what's already there.

## Language & framework

- Plain JavaScript/JSX throughout — no TypeScript, no `.ts`/`.tsx` files. Don't introduce TS tooling.
- Next.js App Router conventions: `page.js` for routes, `route.js` for API handlers, `layout.js` for shared shells.
- `'use client'` at the top of any component using hooks/state/browser APIs. Server components and API routes have no directive.

## File organization

- Shared, reusable UI: `components/PascalCase.js`. shadcn/ui primitives live in `components/ui/` — reuse `Button`, `Alert`, `AlertDescription`, `Badge`, `Progress`, `Tabs`/`TabsList`/`TabsTrigger`, `Input`, etc. rather than hand-rolling equivalents.
- Route-scoped client logic: a sibling `*Client.js` next to that route's `page.js` (e.g. `HomeClient.js`, `DeckDetailClient.js`, `ReviewClient.js`, `CloudClient.js`) — `page.js` stays a thin server component that fetches initial data and renders the client component.
- Non-UI logic: `lib/`. One concern per file (`fsrs.js`, `mastery.js`, `stats.js`, `tier.js`, `clozeBlank.js`, `normalizeWord.js`, prompt-builders as `*Generation.js`). Prefer a small new `lib/` module over growing an unrelated one.
- API routes: `app/api/.../route.js`. Keep handlers thin — auth check, input validation, call a `lib/` helper, return `Response.json(...)`. Push prompt text and business logic into `lib/`, not the handler.

## Patterns to follow

- Every route that mutates data or calls Claude checks `supabase.auth.getUser()` first and returns 401 if absent — this is non-negotiable, not case-by-case (see DECISIONS.md, real incident).
- Errors from `lib/` helpers carry a `.status` property (`err.status = 500`); route handlers do `catch (err) { return Response.json({ error: err.message }, { status: err.status || 500 }) }`. Match this shape for new helpers rather than inventing a new error convention.
- Trigger data fetches from event handlers (click, submit), not mount `useEffect`, when the fetch is conditional on user action — see the `WordCloud.js` pattern in DECISIONS.md. Avoids the set-state-in-effect lint smell and keeps presentational components pure.
- Any new "generate once, reuse forever" AI output should be cached in a jsonb column on the owning row (the `cards.related_words` pattern), not regenerated on every page view.
- Any AI prompt with a "don't repeat/don't include X" instruction needs a deterministic filter applied after the response, not just prompt wording — see `dedupeSuggestions()`.

## Comments & style

- Sparse comments, matching the existing codebase: explain *why* (a non-obvious constraint, a workaround, a deliberate simplification), never *what* the code visibly does. No docstring blocks.
- No speculative abstractions or config flags for hypothetical future needs — this is a small, actively-iterating app; match the scope of the actual change.

## Database changes

- New schema changes go in a new numbered migration file, `supabase/NNN_description.sql` (matches `002_add_deck_profile.sql`, `003_add_related_words.sql`, `004_add_readings.sql`) — don't hand-edit already-shipped table definitions in `schema.sql` except to append an idempotent `alter table ... add column if not exists` at the bottom, matching the file's existing style.
- Every new table needs RLS enabled and an `auth.uid() = user_id` policy — no table should ship without it.

## Verification

- This is a UI-heavy app. After a frontend change, run the dev server and actually click through the affected flow — don't call a change done because lint/build passed.
- If a nested dynamic API route suddenly 404s with an HTML body for no code reason, that's the known Turbopack dev-server gotcha (see PROJECT_CONTEXT.md) — don't debug it as a code bug; `rm -rf .next` and restart, after confirming with the user since it's their terminal session.

## Git

- Commit subjects: short, imperative, no period (matches `git log`, e.g. "Add generation progress indicator for AI word/topic calls"). Don't amend published commits; make a new commit.
