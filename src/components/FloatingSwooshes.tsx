import { useMemo } from "react";

/**
 * Site-wide ambient swooshes — fixed full-viewport layer of slowly drifting
 * gradient ribbons. Sits behind content, pointer-events disabled.
 * Uses stable placements so the design is always visible on mobile too.
 */
interface FloatingSwooshesProps {
  count?: number;
}

const swooshPlacements = [
  { size: "clamp(300px, 96vw, 760px)", top: -9, left: 6, rotate: 24, duration: 36, delay: -8, dx: 46, dy: 30, opacity: 0.62, flip: false },
  { size: "clamp(280px, 90vw, 700px)", top: 26, left: 48, rotate: -18, duration: 42, delay: -18, dx: -54, dy: 38, opacity: 0.5, flip: true },
  { size: "clamp(260px, 82vw, 640px)", top: 58, left: -18, rotate: 10, duration: 48, delay: -28, dx: 58, dy: -36, opacity: 0.46, flip: false },
  { size: "clamp(220px, 70vw, 560px)", top: 74, left: 50, rotate: 34, duration: 44, delay: -12, dx: -42, dy: -44, opacity: 0.38, flip: true },
  { size: "clamp(240px, 76vw, 620px)", top: 8, left: -28, rotate: -30, duration: 52, delay: -35, dx: 50, dy: 48, opacity: 0.42, flip: true },
  { size: "clamp(280px, 86vw, 720px)", top: 42, left: 8, rotate: 52, duration: 58, delay: -22, dx: -36, dy: 54, opacity: 0.34, flip: false },
];

export const FloatingSwooshes = ({ count = 5 }: FloatingSwooshesProps) => {
  const swooshes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({ i, ...swooshPlacements[i % swooshPlacements.length] })),
    [count]
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[1] overflow-hidden pointer-events-none mix-blend-screen opacity-90 dark:opacity-100"
    >
      {swooshes.map((s) => (
        <div
          key={s.i}
          className="absolute will-change-transform"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            aspectRatio: "1 / 1",
            transform: `rotate(${s.rotate}deg)`,
            opacity: s.opacity,
            animation: `drift-dot ${s.duration}s ease-in-out ${s.delay}s infinite`,
            ['--dx' as string]: `${s.dx}px`,
            ['--dy' as string]: `${s.dy}px`,
            filter: "blur(0.5px) saturate(1.35)",
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
                <stop offset="35%" stopColor="hsl(var(--primary) / 0.85)" />
                <stop offset="70%" stopColor="hsl(var(--accent) / 0.95)" />
                <stop offset="100%" stopColor="hsl(var(--primary-glow) / 0.8)" />
              </linearGradient>
              <linearGradient id={`fs-b-${s.i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--accent) / 0)" />
                <stop offset="50%" stopColor="hsl(var(--accent) / 0.75)" />
                <stop offset="100%" stopColor="hsl(var(--primary) / 0.85)" />
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
