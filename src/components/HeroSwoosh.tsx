/**
 * Stripe-inspired flowing gradient swoosh.
 * - Uses only --primary and --accent design tokens (theme-aware).
 * - Light/dark variants via Tailwind `dark:` opacity.
 * - Scales smoothly via clamp() + aspectRatio (no vh hacks).
 * - Positioned off to the right so it never overlaps the centered headline.
 * - z-0 background layer; hero content sits at z-10, CTAs stay clickable.
 */
interface HeroSwooshProps {
  /** "hero" = large background ribbon, "ambient" = small subtle accent for app shells */
  variant?: "hero" | "ambient";
}

export const HeroSwoosh = ({ variant = "hero" }: HeroSwooshProps) => {
  const isAmbient = variant === "ambient";

  // Smooth, fluid scaling. Width clamps between a sensible min and max.
  const sizeStyle: React.CSSProperties = isAmbient
    ? {
        width: "clamp(280px, 55vw, 720px)",
        aspectRatio: "1 / 1",
      }
    : {
        width: "clamp(340px, 85vw, 1300px)",
        aspectRatio: "1 / 1",
      };

  return (
    <div
      aria-hidden="true"
      className={
        // Clipped to its own bounds; sits behind hero content.
        // Anchored to top-right so the headline (centered) stays clear.
        "pointer-events-none absolute z-0 overflow-hidden " +
        (isAmbient
          ? "-top-24 -right-24 opacity-50 dark:opacity-40"
          : "-top-20 -right-32 sm:-right-40 md:-right-48 opacity-80 dark:opacity-70")
      }
      style={sizeStyle}
    >
      <svg
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          {/* Token-only gradients. Both stops use --primary / --accent so light + dark themes adapt automatically. */}
          <linearGradient id="rm-swoosh-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0)" />
            <stop offset="25%" stopColor="hsl(var(--primary) / 0.55)" />
            <stop offset="65%" stopColor="hsl(var(--accent) / 0.9)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.85)" />
          </linearGradient>
          <linearGradient id="rm-swoosh-b" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--accent) / 0)" />
            <stop offset="50%" stopColor="hsl(var(--accent) / 0.5)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
          </linearGradient>
          <radialGradient id="rm-swoosh-bloom" cx="75%" cy="30%" r="60%">
            <stop offset="0%" stopColor="hsl(var(--accent) / 0.55)" />
            <stop offset="60%" stopColor="hsl(var(--primary) / 0.25)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
          </radialGradient>
          <filter id="rm-swoosh-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>

        {/* Soft bloom in upper-right */}
        <rect x="0" y="0" width="800" height="800" fill="url(#rm-swoosh-bloom)" />

        {/* Layered ribbon curves */}
        <g filter="url(#rm-swoosh-blur)">
          {Array.from({ length: 26 }).map((_, i) => {
            const t = i / 25;
            const offsetY = t * 110;
            const opacity = 0.18 + (1 - Math.abs(0.5 - t) * 2) * 0.55;
            return (
              <path
                key={i}
                d={`M ${-60 + t * 40} ${-40 + offsetY}
                    C ${180 + t * 30} ${80 + offsetY * 0.6},
                      ${360 + t * 20} ${380 + offsetY * 0.8},
                      ${860} ${260 + offsetY * 1.1}`}
                stroke={i % 2 === 0 ? "url(#rm-swoosh-a)" : "url(#rm-swoosh-b)"}
                strokeWidth={2 + t * 1.5}
                fill="none"
                opacity={opacity}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default HeroSwoosh;
