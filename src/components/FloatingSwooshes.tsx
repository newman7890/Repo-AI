import { useMemo } from "react";

/**
 * Site-wide ambient swooshes — fixed full-viewport layer of slowly drifting
 * gradient ribbons. Sits behind all content (z-0), pointer-events disabled.
 * Pairs with <FloatingDots /> for a Stripe-inspired animated background.
 */
interface FloatingSwooshesProps {
  count?: number;
}

export const FloatingSwooshes = ({ count = 5 }: FloatingSwooshesProps) => {
  const swooshes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = 40 + Math.random() * 50; // 40-90vw
        const top = Math.random() * 90 - 10;
        const left = Math.random() * 90 - 10;
        const rotate = Math.random() * 360;
        const duration = 30 + Math.random() * 30; // 30-60s
        const delay = Math.random() * -30;
        const dx = (Math.random() - 0.5) * 200;
        const dy = (Math.random() - 0.5) * 200;
        const opacity = 0.25 + Math.random() * 0.35;
        const flip = i % 2 === 0;
        return { i, size, top, left, rotate, duration, delay, dx, dy, opacity, flip };
      }),
    [count]
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
    >
      {swooshes.map((s) => (
        <div
          key={s.i}
          className="absolute"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}vw`,
            aspectRatio: "1 / 1",
            transform: `rotate(${s.rotate}deg)`,
            opacity: s.opacity,
            animation: `drift-dot ${s.duration}s ease-in-out ${s.delay}s infinite`,
            ['--dx' as string]: `${s.dx}px`,
            ['--dy' as string]: `${s.dy}px`,
            filter: "blur(2px)",
          }}
        >
          <svg
            viewBox="0 0 800 800"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
            style={{ transform: s.flip ? "scaleX(-1)" : undefined }}
          >
            <defs>
              <linearGradient id={`fs-a-${s.i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary) / 0)" />
                <stop offset="35%" stopColor="hsl(var(--primary) / 0.6)" />
                <stop offset="70%" stopColor="hsl(var(--accent) / 0.9)" />
                <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
              </linearGradient>
              <linearGradient id={`fs-b-${s.i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--accent) / 0)" />
                <stop offset="50%" stopColor="hsl(var(--accent) / 0.5)" />
                <stop offset="100%" stopColor="hsl(var(--primary) / 0.7)" />
              </linearGradient>
            </defs>
            <g>
              {Array.from({ length: 22 }).map((_, k) => {
                const t = k / 21;
                const offsetY = t * 110;
                const op = 0.18 + (1 - Math.abs(0.5 - t) * 2) * 0.55;
                return (
                  <path
                    key={k}
                    d={`M ${-60 + t * 40} ${-40 + offsetY}
                        C ${180 + t * 30} ${80 + offsetY * 0.6},
                          ${360 + t * 20} ${380 + offsetY * 0.8},
                          ${860} ${260 + offsetY * 1.1}`}
                    stroke={k % 2 === 0 ? `url(#fs-a-${s.i})` : `url(#fs-b-${s.i})`}
                    strokeWidth={2 + t * 1.5}
                    fill="none"
                    opacity={op}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
};

export default FloatingSwooshes;
