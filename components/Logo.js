// Brand mark: a glowing neural network in the shape of a brain, with Spanish
// characters (¡ ¿ ñ á) lighting up four of the neurons — language wired into
// memory. Neon-on-dark in the Spanish flag palette (red / gold / white), so
// the mark carries its own dark badge and reads the same on light or dark
// app backgrounds. Pure inline SVG.

const RED = '#E8382F'
const GOLD = '#F6C31C'
const WHITE = '#F4F1EA'

// One shared network definition, rendered twice: once blurred (the neon glow)
// and once crisp on top. Edges + nodes + glyphs all live here so the whole
// thing glows together.
function Network() {
  return (
    <>
      {/* Synapse edges */}
      <g fill="none" strokeWidth="1" strokeLinecap="round">
        <g stroke={RED} opacity="0.7">
          <path d="M26 16 L16 24" /><path d="M16 24 L13 33" /><path d="M13 33 L20 45" />
          <path d="M16 24 L24 30" /><path d="M13 33 L24 30" /><path d="M20 45 L30 40" />
          <path d="M24 30 L34 25" />
        </g>
        <g stroke={GOLD} opacity="0.7">
          <path d="M26 16 L37 16" /><path d="M37 16 L34 25" /><path d="M34 25 L42 32" />
          <path d="M30 40 L31 49" /><path d="M42 32 L51 33" /><path d="M30 40 L42 32" />
          <path d="M20 45 L31 49" />
        </g>
        <g stroke={WHITE} opacity="0.6">
          <path d="M37 16 L48 22" /><path d="M48 22 L51 33" /><path d="M42 32 L43 45" />
          <path d="M51 33 L43 45" /><path d="M43 45 L31 49" /><path d="M24 30 L42 32" />
        </g>
      </g>

      {/* Plain neurons */}
      <g>
        <circle cx="16" cy="24" r="2" fill={GOLD} />
        <circle cx="13" cy="33" r="2" fill={RED} />
        <circle cx="20" cy="45" r="2" fill={RED} />
        <circle cx="31" cy="49" r="2" fill={GOLD} />
        <circle cx="43" cy="45" r="2" fill={WHITE} />
        <circle cx="51" cy="33" r="2.2" fill={GOLD} />
        <circle cx="48" cy="22" r="2" fill={WHITE} />
        <circle cx="37" cy="16" r="2" fill={GOLD} />
        <circle cx="26" cy="16" r="2" fill={RED} />
      </g>

      {/* Glyph neurons — the Spanish characters */}
      <g fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" textAnchor="middle" dominantBaseline="central">
        <circle cx="24" cy="30" r="4.6" fill={RED} />
        <text x="24" y="30.4" fontSize="6.2" fill={WHITE}>¡</text>

        <circle cx="34" cy="25" r="4.8" fill={GOLD} />
        <text x="34" y="25.4" fontSize="6.4" fill="#1a1408">¿</text>

        <circle cx="42" cy="32" r="4.8" fill={WHITE} />
        <text x="42" y="32.4" fontSize="6.4" fill="#1a1408">ñ</text>

        <circle cx="30" cy="40" r="4.6" fill={GOLD} />
        <text x="30" y="40.4" fontSize="6.2" fill="#1a1408">á</text>
      </g>
    </>
  )
}

export function LogoMark({ className = 'size-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <filter id="lr-neon" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <clipPath id="lr-badge">
          <rect x="0" y="0" width="64" height="64" rx="15" />
        </clipPath>
      </defs>

      <g clipPath="url(#lr-badge)">
        {/* Dark badge so the neon reads on any app background */}
        <rect x="0" y="0" width="64" height="64" fill="#14100c" />
        {/* Spanish flag accent bars, top and bottom */}
        <rect x="0" y="0" width="64" height="2.5" fill={RED} />
        <rect x="0" y="2.5" width="64" height="2" fill={GOLD} opacity="0.9" />
        <rect x="0" y="59.5" width="64" height="2" fill={GOLD} opacity="0.9" />
        <rect x="0" y="61.5" width="64" height="2.5" fill={RED} />

        {/* Glow pass, then crisp pass */}
        <g filter="url(#lr-neon)" opacity="0.9"><Network /></g>
        <Network />
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
        Lingo<span style={{ color: RED }}>Rewired</span>
      </span>
    </div>
  )
}
