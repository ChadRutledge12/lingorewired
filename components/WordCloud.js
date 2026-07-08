'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, RefreshCw, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const VIEW_W = 640
const VIEW_H = 520
const CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 }
const RADIUS = 190
const NODE_W = 132
const NODE_H = 64

// Evenly spaced around the circle, starting at the top and going clockwise —
// matches the reference sketch's layout of a center word with radiating links.
function nodePosition(index, total) {
  const angle = (-90 + (360 / total) * index) * (Math.PI / 180)
  return {
    x: CENTER.x + RADIUS * Math.cos(angle),
    y: CENTER.y + RADIUS * Math.sin(angle),
  }
}

// Presentational only — the caller owns fetching/caching the related-word
// cluster (triggered from the click that opens this modal, not from an
// effect here) and passes the resulting loading/error/related state in.
export default function WordCloud({ card, related, loading, error, onClose, onRetry }) {
  const router = useRouter()
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reviewCluster = async () => {
    setReviewing(true)
    setReviewError('')
    try {
      const res = await fetch(`/api/cards/${card.id}/related/add`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add cluster to deck')
      router.push(`/review/${data.deckId}?cards=${data.cardIds.join(',')}`)
    } catch (err) {
      setReviewError(err.message || 'Failed to add cluster to deck')
      setReviewing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-card ring-1 ring-foreground/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 text-muted-foreground">
          <X className="size-4" />
        </Button>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">Finding related words for &ldquo;{card.word}&rdquo;...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <Button size="sm" variant="outline" onClick={onRetry} className="rounded-lg">
                <RefreshCw className="size-3.5" /> Try again
              </Button>
            </div>
          ) : (
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" style={{ maxHeight: '70vh' }}>
              {related.map((r, i) => {
                const pos = nodePosition(i, related.length)
                const midX = (CENTER.x + pos.x) / 2
                const midY = (CENTER.y + pos.y) / 2
                return (
                  <g key={`line-${i}`}>
                    <line x1={CENTER.x} y1={CENTER.y} x2={pos.x} y2={pos.y} stroke="var(--border)" strokeWidth="2" />
                    {r.connector && (
                      <foreignObject x={midX - 45} y={midY - 12} width={90} height={24}>
                        <div className="flex h-full items-center justify-center">
                          <span className="whitespace-nowrap rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {r.connector}
                          </span>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                )
              })}

              {related.map((r, i) => {
                const pos = nodePosition(i, related.length)
                return (
                  <foreignObject key={`node-${i}`} x={pos.x - NODE_W / 2} y={pos.y - NODE_H / 2} width={NODE_W} height={NODE_H}>
                    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-background px-2 py-1.5 text-center shadow-sm">
                      <span className="text-sm font-semibold leading-tight text-foreground">{r.word}</span>
                      <span className="text-[11px] leading-tight text-muted-foreground">{r.translation}</span>
                    </div>
                  </foreignObject>
                )
              })}

              <foreignObject
                x={CENTER.x - NODE_W / 2 - 10}
                y={CENTER.y - NODE_H / 2 - 6}
                width={NODE_W + 20}
                height={NODE_H + 12}>
                <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-primary px-2 py-1.5 text-center shadow-md">
                  <span className="text-base font-bold leading-tight text-primary-foreground">{card.word}</span>
                  <span className="text-xs leading-tight text-primary-foreground/80">{card.translation}</span>
                </div>
              </foreignObject>
            </svg>
          )}

          {!loading && !error && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <Button onClick={reviewCluster} disabled={reviewing} className="rounded-xl">
                {reviewing ? <Loader2 className="size-3.5 animate-spin" /> : <GraduationCap className="size-3.5" />}
                {reviewing ? 'Adding to deck...' : 'Review this cluster'}
              </Button>
              <p className="text-xs text-muted-foreground">Adds these words to the deck, then starts a review session</p>
              {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
