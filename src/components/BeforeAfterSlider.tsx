import { useState, useRef, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

const BeforeAfterSlider = ({ beforeImage, afterImage }: BeforeAfterSliderProps) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-border cursor-col-resize select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After (full) */}
      <img src={afterImage} alt="After" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={beforeImage} alt="Before" className="w-full h-full object-cover" />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3L2 8L5 13" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 3L14 8L11 13" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white px-2 py-0.5 rounded-full z-20">Before</span>
      <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white px-2 py-0.5 rounded-full z-20">After</span>
    </div>
  );
};

export default BeforeAfterSlider;
