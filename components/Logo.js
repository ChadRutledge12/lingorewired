// Brand mark: a glowing brain drawn as a neural network, with Spanish
// characters (¡ ¿ ñ á) lighting up four of the neurons — language wired into
// memory. A soft brain silhouette (bumpy gyri on top, cerebellum + stem
// notch at the lower left) holds the network so it reads as a brain, not
// just a graph. Neon-on-dark in the Spanish flag palette (red / gold /
// white), self-contained dark badge so it looks the same on any background.

const RED = '#E8382F'
const GOLD = '#F6C31C'
const WHITE = '#F4F1EA'

// Left-facing brain silhouette: frontal lobe at left, gyri bumps across the
// top, occipital curve at right, cerebellum + brain-stem notch bottom-left.
const BRAIN_OUTLINE =
  'M17 38 C11 36 9 28 14 24 C12 19 17 15 23 17 C25 12 31 12 33 16 ' +
  'C36 12 42 12 44 17 C50 15 55 20 52 26 C56 30 53 36 48 36 ' +
  'C50 41 45 45 40 43 C38 47 32 47 30 43 C28 46 22 46 22 41 ' +
  'C19 43 16 42 17 38 Z'
// Central fissure — the crease down the middle of a brain.
const BRAIN_SULCUS = 'M33 16 C30 22 34 26 31 31 C28 35 33 39 30 43'

// One shared definition, rendered twice: blurred (neon glow) then crisp.
function Network() {
  return (
    <>
      {/* Brain silhouette + central fissure */}
      <path d={BRAIN_OUTLINE} fill="none" stroke={GOLD} strokeWidth="1.3" opacity="0.55" strokeLinejoin="round" />
      <path d={BRAIN_SULCUS} fill="none" stroke={WHITE} strokeWidth="1" opacity="0.3" strokeLinecap="round" />

      {/* Synapse edges */}
      <g fill="none" strokeWidth="1" strokeLinecap="round">
        <g stroke={RED} opacity="0.7">
          <path d="M15 27 L22 18" /><path d="M15 27 L25 29" /><path d="M22 18 L25 29" />
          <path d="M17 37 L22 41" /><path d="M15 27 L17 37" /><path d="M22 41 L31 38" />
        </g>
        <g stroke={GOLD} opacity="0.7">
          <path d="M22 18 L32 15" /><path d="M32 15 L35 25" /><path d="M25 29 L35 25" />
          <path d="M31 38 L31 44" /><path d="M35 25 L43 32" /><path d="M31 38 L25 29" />
          <path d="M22 41 L31 44" /><path d="M32 15 L43 18" />
        </g>
        <g stroke={WHITE} opacity="0.6">
          <path d="M43 18 L51 26" /><path d="M51 26 L48 35" /><path d="M43 32 L51 26" />
          <path d="M43 32 L48 35" /><path d="M48 35 L40 43" /><path d="M40 43 L31 44" />
          <path d="M35 25 L43 18" />
        </g>
      </g>

      {/* Plain neurons, following the brain contour */}
      <g>
        <circle cx="15" cy="27" r="2" fill={GOLD} />
        <circle cx="22" cy="18" r="2" fill={RED} />
        <circle cx="32" cy="15" r="2" fill={GOLD} />
        <circle cx="43" cy="18" r="2" fill={GOLD} />
        <circle cx="51" cy="26" r="2.2" fill={GOLD} />
        <circle cx="48" cy="35" r="2" fill={WHITE} />
        <circle cx="40" cy="43" r="2" fill={WHITE} />
        <circle cx="31" cy="44" r="2" fill={GOLD} />
        <circle cx="22" cy="41" r="2" fill={RED} />
        <circle cx="17" cy="37" r="2" fill={RED} />
      </g>

      {/* Glyph neurons — the Spanish characters, in the core of the brain */}
      <g fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" textAnchor="middle" dominantBaseline="central">
        <circle cx="25" cy="29" r="4.6" fill={RED} />
        <text x="25" y="29.4" fontSize="6.2" fill={WHITE}>¡</text>

        <circle cx="35" cy="25" r="4.8" fill={GOLD} />
        <text x="35" y="25.4" fontSize="6.4" fill="#1a1408">¿</text>

        <circle cx="43" cy="32" r="4.8" fill={WHITE} />
        <text x="43" y="32.4" fontSize="6.4" fill="#1a1408">ñ</text>

        <circle cx="31" cy="38" r="4.6" fill={GOLD} />
        <text x="31" y="38.4" fontSize="6.2" fill="#1a1408">á</text>
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
