import { useState, useRef, useCallback, useEffect } from "react";
import { Clock, Sparkles } from "lucide-react";
import { trackSliderEvent } from "@/lib/slider-tracking";

export interface ShowcaseExample {
  id: string;
  before_image: string;
  after_image: string;
  before_alt: string;
  after_alt: string;
  prompt: string;
  generation_seconds: number;
}

interface ShowcaseSliderProps {
  example: ShowcaseExample;
}

/**
 * Convert a Supabase public storage URL into the on-the-fly image
 * transformer URL so the CDN serves a resized WebP instead of the
 * original multi-MB JPEG/PNG. Falls back to the original URL for any
 * non-Supabase asset.
 */
const transformedSrc = (url: string, width = 800) => {
  if (!url) return url;
  return url.replace(
    "/storage/v1/object/public/",
    `/storage/v1/render/image/public/`,
  ) + (url.includes("?") ? "&" : "?") + `width=${width}&quality=70&resize=contain`;
};

const ShowcaseSlider = ({ example }: ShowcaseSliderProps) => {
  const [position, setPosition] = useState(50);
  const [aspectRatio, setAspectRatio] = useState<number>(3 / 4);
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasTrackedView = useRef(false);
  const hasTrackedDrag = useRef(false);

  // Detect natural aspect ratio
  useEffect(() => {
    if (!example.after_image) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = transformedSrc(example.after_image);
  }, [example.after_image]);

  // Track impressions when slider scrolls into view
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackSliderEvent(example.id, "view");
          }
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [example.id]);

  const rafRef = useRef<number | null>(null);
  const cachedRect = useRef<DOMRect | null>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!containerRef.current) return;
      // Cache the rect during a drag to avoid forced reflow on every move
      const rect = cachedRect.current ?? containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      setPosition((x / rect.width) * 100);
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // Cache rect once per drag — measuring on every pointermove forces reflow
    cachedRect.current = containerRef.current?.getBoundingClientRect() ?? null;
    updatePosition(e.clientX);
    setShowInfo(true);
    if (!hasTrackedDrag.current) {
      hasTrackedDrag.current = true;
      trackSliderEvent(example.id, "drag_start");
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    if (isDragging.current) {
      trackSliderEvent(example.id, "drag_complete");
    }
    isDragging.current = false;
    cachedRect.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  return (
    <figure className="space-y-3">
      <div
        ref={containerRef}
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        className="relative mx-auto rounded-2xl overflow-hidden border border-border cursor-col-resize select-none touch-none bg-muted/20 group w-full"
        style={{
          aspectRatio: `${aspectRatio}`,
          maxHeight: "min(70vh, 600px)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          src={transformedSrc(example.after_image)}
          alt={example.after_alt}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== example.after_image) img.src = example.after_image;
          }}
          className="absolute inset-0 w-full h-full object-contain"
        />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img
            src={transformedSrc(example.before_image)}
            alt={example.before_alt}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== example.before_image) img.src = example.before_image;
            }}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M5 3L2 8L5 13" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 3L14 8L11 13" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <span className="absolute top-3 left-3 text-[10px] md:text-xs font-bold uppercase tracking-wider bg-black/60 text-white px-2.5 py-1 rounded-full z-20 backdrop-blur-sm">Before</span>
        <span className="absolute top-3 right-3 text-[10px] md:text-xs font-bold uppercase tracking-wider bg-primary/80 text-primary-foreground px-2.5 py-1 rounded-full z-20 backdrop-blur-sm">After</span>

        {/* Hover/tap info overlay */}
        <div
          className={`absolute left-3 right-3 bottom-3 z-20 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2.5 transition-all duration-300 ${
            showInfo ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <div className="flex items-start gap-2 text-white">
            <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] md:text-xs leading-snug italic line-clamp-3">
              "{example.prompt}"
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] md:text-[11px] text-white/70">
            <Clock className="w-3 h-3" />
            <span>Generated in {example.generation_seconds}s</span>
          </div>
        </div>
      </div>

      {/* Always-visible caption (mobile-friendly + good for SEO) */}
      <figcaption className="text-xs md:text-sm text-muted-foreground text-center px-2">
        <span className="italic">"{example.prompt}"</span>
        <span className="mx-2 opacity-50">·</span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {example.generation_seconds}s
        </span>
      </figcaption>
    </figure>
  );
};

export default ShowcaseSlider;
