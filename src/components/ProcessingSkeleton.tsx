import { useEffect, useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessingSkeletonProps {
  onCancel: () => void;
}

const STATUSES = [
  "Analyzing image...",
  "Applying style...",
  "Rendering details...",
  "Almost there...",
];

const ProcessingSkeleton = ({ onCancel }: ProcessingSkeletonProps) => {
  const [progress, setProgress] = useState(4);
  const [statusIdx, setStatusIdx] = useState(0);

  // Smooth animated progress that eases toward 95% (caps so it never claims "done")
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      // Ease-out curve toward 95%
      const next = Math.min(95, 4 + (1 - Math.exp(-elapsed / 6)) * 92);
      setProgress(next);
      setStatusIdx(Math.min(STATUSES.length - 1, Math.floor(elapsed / 3)));
    }, 120);
    return () => clearInterval(id);
  }, []);

  // Pre-compute particle positions so they don't shift between renders
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: 40 + Math.random() * 55,
        delay: Math.random() * 3,
        duration: 2.4 + Math.random() * 2.2,
        size: 3 + Math.random() * 3,
        cyan: i % 3 === 0,
      })),
    []
  );

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="relative w-full mx-auto max-w-md aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-b from-[hsl(250_25%_6%)] via-[hsl(265_30%_8%)] to-[hsl(250_25%_5%)] border border-border/40 shadow-2xl">
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                background: p.cyan
                  ? "hsl(var(--accent))"
                  : "hsl(var(--primary-glow))",
                boxShadow: `0 0 10px ${
                  p.cyan ? "hsl(var(--accent))" : "hsl(var(--primary-glow))"
                }`,
                animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        {/* Centered content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6">
          {/* Glowing dual-ring spinner with phone in center */}
          <div className="relative w-44 h-44">
            {/* Outer glow halo */}
            <div
              className="absolute inset-[-30px] rounded-full opacity-60 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 70%)",
              }}
            />
            {/* Outer purple ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "4px solid hsl(var(--primary) / 0.15)",
                borderTopColor: "hsl(var(--primary))",
                borderRightColor: "hsl(var(--primary-glow))",
                animation: "spin 1.6s linear infinite",
                boxShadow: "0 0 30px hsl(var(--primary) / 0.5)",
              }}
            />
            {/* Inner cyan ring */}
            <div
              className="absolute inset-5 rounded-full"
              style={{
                border: "3px solid hsl(var(--accent) / 0.15)",
                borderBottomColor: "hsl(var(--accent))",
                borderLeftColor: "hsl(var(--accent))",
                animation: "spin 2.2s linear infinite reverse",
              }}
            />
            {/* Phone icon center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-12 rounded-md border-2 border-foreground/80 bg-background/40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
              </div>
            </div>
          </div>

          {/* Status text */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {STATUSES[statusIdx]}
            </h3>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-[260px] flex flex-col items-center gap-2">
            <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                  boxShadow: "0 0 12px hsl(var(--primary) / 0.7)",
                }}
              />
            </div>
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Cancel */}
          <Button
            onClick={onCancel}
            variant="secondary"
            size="sm"
            className="gap-1.5 mt-2 bg-background/60 backdrop-blur-sm hover:bg-background/80"
          >
            <X className="w-4 h-4" /> Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingSkeleton;
