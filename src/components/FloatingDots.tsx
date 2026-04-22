import { useMemo } from "react";

interface FloatingDotsProps {
  count?: number;
}

/**
 * Renders animated purple dots that drift across the entire viewport.
 * Purely decorative — fixed, pointer-events disabled, behind content.
 */
export const FloatingDots = ({ count = 200 }: FloatingDotsProps) => {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const size = Math.random() * 4 + 2; // 2-6px
        const duration = Math.random() * 12 + 8; // 8-20s
        const delay = Math.random() * -20; // negative for staggered start
        const top = Math.random() * 100;
        const left = Math.random() * 100;
        const dx = (Math.random() - 0.5) * 200; // -100 to 100px
        const dy = (Math.random() - 0.5) * 200;
        const opacity = Math.random() * 0.5 + 0.3;
        return { i, size, duration, delay, top, left, dx, dy, opacity };
      }),
    [count]
  );

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {dots.map((d) => (
        <span
          key={d.i}
          className="absolute rounded-full bg-primary"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            opacity: d.opacity,
            boxShadow: `0 0 ${d.size * 2}px hsl(var(--primary) / 0.6)`,
            animation: `drift-dot ${d.duration}s ease-in-out ${d.delay}s infinite`,
            ['--dx' as string]: `${d.dx}px`,
            ['--dy' as string]: `${d.dy}px`,
          }}
        />
      ))}
    </div>
  );
};
