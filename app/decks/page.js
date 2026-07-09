import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Flame, Target, TrendingUp, BookOpen, Cloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { humanInterval } from '@/lib/fsrs'
import { computeStats } from '@/lib/stats'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogoLink } from '@/components/Logo'
import DeleteDeckButton from './DeleteDeckButton'
import NewEmptyDeckButton from './NewEmptyDeckButton'

export const dynamic = 'force-dynamic'

function StatTile({ icon: Icon, label, value, chipClasses }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-4">
      <div className={`mb-2 flex size-8 items-center justify-center rounded-full ${chipClasses}`}>
        <Icon className="size-4" />
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  )
}

// Retention colour is a signal, not decoration: green when it's healthy,
// amber when it's slipping, red when a lot of cards are being forgotten.
function retentionChipClasses(retention) {
  if (retention === null) return 'bg-muted text-muted-foreground'
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

  const [{ data: decks }, { data: cards }, { data: reviewLogs }] = await Promise.all([
    supabase.from('decks').select('id, name, created_at').order('created_at', { ascending: false }),
    supabase.from('cards').select('deck_id, due, state'),
    supabase.from('review_logs').select('rating, review'),
  ])

  const now = new Date()
  const nowIso = now.toISOString()
  const counts = {}
  for (const c of cards || []) {
    const e = counts[c.deck_id] || (counts[c.deck_id] = { total: 0, due: 0, nextDue: null })
    e.total += 1
    if (c.due <= nowIso) e.due += 1
    else if (!e.nextDue || c.due < e.nextDue) e.nextDue = c.due
  }

  const stats = computeStats(reviewLogs || [], cards || [])
  const totalDue = Object.values(counts).reduce((sum, c) => sum + c.due, 0)

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <LogoLink className="mb-5" />
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My decks</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/?new=1"><Plus className="size-4" /> New set</Link>
            </Button>
            <NewEmptyDeckButton />
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" className="text-muted-foreground">Sign out</Button>
            </form>
          </div>
        </div>

        {decks && decks.length > 0 && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile icon={Flame} label="Day streak" value={stats.streak} chipClasses="bg-orange-50 text-orange-600" />
            <StatTile icon={Target} label="Reviews today" value={stats.reviewsToday} chipClasses="bg-primary/10 text-primary" />
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
          <Button asChild variant="outline" className="w-full rounded-xl h-11 mb-6">
            <Link href="/cloud"><Cloud className="size-4" /> Your word cloud — see what you know</Link>
          </Button>
        )}

        {(!decks || decks.length === 0) ? (
          <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-foreground font-medium mb-1">No decks yet</p>
            <p className="text-sm text-muted-foreground mb-4">
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
                <div key={deck.id} className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-semibold text-foreground">{deck.name}</h2>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.due > 0 && <Badge>{c.due} due</Badge>}
                      <DeleteDeckButton deckId={deck.id} deckName={deck.name} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
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
                        <Button asChild variant="outline" className="rounded-xl">
                          <Link href={`/decks/${deck.id}`}>View</Link>
                        </Button>
                      </>
                    ) : (
                      <Button asChild variant="outline" className="w-full rounded-xl">
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
