'use client'

// Situation picker for the premade "survival guide" decks — replaces the old
// AI fast-path. Purely presentational: tapping a guide hands it straight back
// to the parent, which owns saving/navigation (same pattern as Calibration).
export default function SurvivalGuidePicker({ guides, onSelect, onBack, loading }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Survival guides</p>
      <h2 className="text-xl font-semibold mb-1 text-foreground">Pick a situation</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Ready-made A0–A1 word lists — no waiting, just the words you need.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {guides.map((guide) => (
          <button
            key={guide.id}
            type="button"
            disabled={loading}
            onClick={() => onSelect(guide)}
            className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <span className="text-2xl leading-none">{guide.emoji}</span>
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{guide.title}</span>
              <span className="block text-xs text-muted-foreground">{guide.tagline}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        ← Back
      </button>
    </div>
  )
}
