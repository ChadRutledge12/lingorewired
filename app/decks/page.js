import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Flame, TrendingUp, BookOpen, Cloud, Snowflake } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { humanInterval } from '@/lib/fsrs'
import { computeStats } from '@/lib/stats'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogoMark, RED as BRAND_RED } from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import DailyGoalTile from '@/components/DailyGoalTile'
import DeleteDeckButton from './DeleteDeckButton'
import NewEmptyDeckButton from './NewEmptyDeckButton'

export const dynamic = 'force-dynamic'

function StatTile({ icon: Icon, label, value, chipClasses }) {
  return (
    <div className="rounded-2xl bg-slate-100 ring-1 ring-slate-900/10 p-4">
      <div className={`mb-2 flex size-8 items-center justify-center rounded-full ${chipClasses}`}>
        <Icon className="size-4" />
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  )
}

// Retention colour is a signal, not decoration: green when it's healthy,
// amber when it's slipping, red when a lot of cards are being forgotten.
function retentionChipClasses(retention) {
  if (retention === null) return 'bg-slate-200 text-slate-500'
  if (retention >= 80) return 'bg-emerald-50 text-emerald-600'
  if (retention >= 50) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}

export default async function DecksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/decks')

  const [{ data: decks }, { data: cards }, { data: reviewLogs }, { data: profile }] = await Promise.all([
    supabase.from('decks').select('id, name, created_at').order('created_at', { ascending: false }),
    supabase.from('cards').select('deck_id, due, state'),
    supabase.from('review_logs').select('rating, review'),
    supabase.from('profiles').select('daily_goal, streak_freezes, frozen_dates').maybeSingle(),
  ])
  const dailyGoal = profile?.daily_goal ?? 20
  const streakFreezes = profile?.streak_freezes ?? 1
  const frozenDates = profile?.frozen_dates ?? []

  const now = new Date()
  const nowIso = now.toISOString()
  const counts = {}
  for (const c of cards || []) {
    const e = counts[c.deck_id] || (counts[c.deck_id] = { total: 0, due: 0, nextDue: null })
    e.total += 1
    if (c.due <= nowIso) e.due += 1
    else if (!e.nextDue || c.due < e.nextDue) e.nextDue = c.due
  }

  const stats = computeStats(reviewLogs || [], cards || [], frozenDates)
  const totalDue = Object.values(counts).reduce((sum, c) => sum + c.due, 0)

  return (
    <div className="min-h-screen bg-muted/40 dark:bg-[#0f1442] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3" role="img" aria-label="LingoRewired">
            <LogoMark className="size-10 sm:size-14" />
            <span className="font-display text-xl sm:text-3xl font-semibold tracking-tight leading-none" aria-hidden="true">
              <span className="text-foreground dark:text-white">Lingo</span><span style={{ color: BRAND_RED }}>Rewired</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-y-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground dark:text-white">My decks</h1>
            <p className="text-sm text-muted-foreground dark:text-white/50">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
              <Link href="/?new=1"><Plus className="size-4" /> New set</Link>
            </Button>
            <NewEmptyDeckButton />
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" className="text-muted-foreground hover:text-foreground dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10">Sign out</Button>
            </form>
          </div>
        </div>

        {decks && decks.length > 0 && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <StatTile icon={Flame} label="Day streak" value={stats.streak} chipClasses="bg-orange-50 text-orange-600" />
              {streakFreezes > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground dark:text-white/50">
                  <Snowflake className="size-3" /> {streakFreezes} freeze banked
                </p>
              )}
            </div>
            <DailyGoalTile reviewsToday={stats.reviewsToday} dailyGoal={dailyGoal} />
            <StatTile
              icon={TrendingUp}
              label="Retention"
              value={stats.retention !== null ? `${stats.retention}%` : '—'}
              chipClasses={retentionChipClasses(stats.retention)}
            />
            <StatTile icon={BookOpen} label="Total reviews" value={stats.totalReviews} chipClasses="bg-violet-50 text-violet-600" />
          </div>
        )}

        {totalDue > 0 && (
          <Button asChild className="w-full rounded-xl h-12 text-base mb-3">
            <Link href="/review">Review all {totalDue} due now →</Link>
          </Button>
        )}

        {stats.totalCards > 0 && (
          <Button asChild variant="outline" className="w-full rounded-xl h-11 mb-6 dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
            <Link href="/cloud"><Cloud className="size-4" /> Your word cloud — see what you know</Link>
          </Button>
        )}

        {(!decks || decks.length === 0) ? (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 dark:bg-white/10 dark:ring-white/20 p-8 text-center">
            <p className="text-foreground dark:text-white font-medium mb-1">No decks yet</p>
            <p className="text-sm text-muted-foreground dark:text-white/50 mb-4">
              Generate a vocabulary set and save it to start reviewing.
            </p>
            <Button asChild className="rounded-xl">
              <Link href="/">Create your first set</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {decks.map((deck) => {
              const c = counts[deck.id] || { total: 0, due: 0, nextDue: null }
              return (
                <div key={deck.id} className="rounded-2xl bg-card ring-1 ring-foreground/10 dark:bg-white/10 dark:ring-white/20 p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-semibold text-foreground dark:text-white">{deck.name}</h2>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.due > 0 && <Badge>{c.due} due</Badge>}
                      <DeleteDeckButton deckId={deck.id} deckName={deck.name} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-white/50 mb-4">
                    {c.total} card{c.total === 1 ? '' : 's'}
                    {c.due === 0 && c.nextDue && (
                      <> · next review in {humanInterval(now, c.nextDue)}</>
                    )}
                  </p>
                  <div className="mt-auto flex gap-2">
                    {c.due > 0 ? (
                      <>
                        <Button asChild className="flex-1 rounded-xl">
                          <Link href={`/review/${deck.id}`}>Review {c.due} now</Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                          <Link href={`/decks/${deck.id}`}>View</Link>
                        </Button>
                      </>
                    ) : (
                      <Button asChild variant="outline" className="w-full rounded-xl dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                        <Link href={`/decks/${deck.id}`}>View cards</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
