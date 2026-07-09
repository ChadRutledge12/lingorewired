// Brand mark: a brain drawn as a small neural network, with Spanish
// characters (ñ, ¿, á) sitting in place of three of the neurons — language
// wired into memory. Pure inline SVG so it inherits theme colors and costs
// nothing to load.

export function LogoMark({ className = 'size-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* Brain silhouette — soft blob with a stem notch, tilted left. */}
      <path
        d="M32 6c-7 0-9 4-13 5-5 1.2-9 5-9 11 0 3-2 4-2 8s2.5 6 2.5 9C10.5 46 16 52 23 52c3 0 4 2 9 2s6-2 9-2c7 0 12.5-6 12.5-13 0-3 2.5-5 2.5-9s-2-5-2-8c0-6-4-9.8-9-11-4-1-6-5-13-5z"
        className="fill-primary/10 stroke-primary/30"
        strokeWidth="1.5"
      />
      {/* Synapse edges */}
      <g className="stroke-primary/45" strokeWidth="1.3" strokeLinecap="round">
        <path d="M22 24 L32 18" />
        <path d="M32 18 L43 25" />
        <path d="M22 24 L26 36" />
        <path d="M26 36 L38 39" />
        <path d="M43 25 L38 39" />
        <path d="M22 24 L43 25" />
        <path d="M26 36 L18 42" />
        <path d="M38 39 L45 44" />
      </g>
      {/* Plain neurons */}
      <g className="fill-primary">
        <circle cx="32" cy="18" r="2.6" />
        <circle cx="26" cy="36" r="2.2" />
        <circle cx="18" cy="42" r="1.8" />
        <circle cx="45" cy="44" r="1.8" />
      </g>
      {/* Neurons that are Spanish glyphs */}
      <g className="fill-primary" fontWeight="700" textAnchor="middle" fontFamily="var(--font-geist-sans), system-ui, sans-serif">
        <text x="22" y="28.5" fontSize="12">ñ</text>
        <text x="43.5" y="30" fontSize="12">¿</text>
        <text x="38.5" y="44" fontSize="11">á</text>
      </g>
    </svg>
  )
}

// Full lockup: mark + wordmark. Use on the landing card and login page.
export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-10" />
      <span className="text-lg font-bold tracking-tight text-foreground leading-none">
        Lingo<span className="text-primary">Rewired</span>
      </span>
    </div>
  )
}
