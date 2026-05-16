/**
 * Stripe-inspired flowing gradient swoosh.
 * Pure SVG using brand HSL tokens. Anchored top-right, decorative only.
 */
export const HeroSwoosh = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-20 -right-20 w-[120%] md:w-[95%] lg:w-[80%] h-[110vh] md:h-[130vh] max-h-[1400px] overflow-visible -z-0"
    >
      <svg
        viewBox="0 0 800 900"
        preserveAspectRatio="xMaxYMin slice"
        className="w-full h-full"
      >
        <defs>
          {/* Multi-stop gradient that mimics Stripe's pink → orange → blue flow,
              but tinted with our brand primary + accent */}
          <linearGradient id="swoosh-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.0)" />
            <stop offset="20%" stopColor="hsl(var(--primary) / 0.55)" />
            <stop offset="55%" stopColor="hsl(var(--accent) / 0.85)" />
            <stop offset="85%" stopColor="hsl(20 95% 60% / 0.9)" />
            <stop offset="100%" stopColor="hsl(330 90% 65% / 0.85)" />
          </linearGradient>
          <linearGradient id="swoosh-b" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0)" />
            <stop offset="40%" stopColor="hsl(280 85% 65% / 0.45)" />
            <stop offset="100%" stopColor="hsl(15 95% 60% / 0.6)" />
          </linearGradient>
          <filter id="swoosh-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Layered curves create the silky, ribbon-like flow */}
        <g filter="url(#swoosh-blur)">
          {Array.from({ length: 28 }).map((_, i) => {
            const t = i / 27;
            const offsetY = t * 120;
            const opacity = 0.18 + (1 - Math.abs(0.5 - t) * 2) * 0.55;
            return (
              <path
                key={i}
                d={`M ${-50 + t * 40} ${-50 + offsetY}
                    C ${200 + t * 30} ${100 + offsetY * 0.6},
                      ${350 + t * 20} ${400 + offsetY * 0.8},
                      ${850} ${300 + offsetY * 1.1}`}
                stroke={i % 2 === 0 ? "url(#swoosh-a)" : "url(#swoosh-b)"}
                strokeWidth={2 + t * 1.5}
                fill="none"
                opacity={opacity}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Soft warm bloom in the upper-right corner */}
        <ellipse
          cx="780"
          cy="120"
          rx="320"
          ry="220"
          fill="hsl(20 95% 60% / 0.35)"
          filter="url(#swoosh-blur)"
        />
        <ellipse
          cx="700"
          cy="350"
          rx="280"
          ry="260"
          fill="hsl(330 90% 65% / 0.28)"
          filter="url(#swoosh-blur)"
        />
      </svg>
    </div>
  );
};

export default HeroSwoosh;
