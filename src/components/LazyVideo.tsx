import { useEffect, useRef, useState } from "react";

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

/**
 * Defers mounting the <video> element (and its network request) until the
 * section scrolls near the viewport. Saves multi-MB on initial page load.
 */
const LazyVideo = ({ src, poster, className }: LazyVideoProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className="w-full">
      {visible ? (
        <video
          src={src}
          className={className}
          autoPlay
          loop
          muted
          playsInline
          controls
          preload="metadata"
          poster={poster}
        />
      ) : (
        <div
          className={className}
          style={{
            aspectRatio: "16 / 9",
            background: poster ? `center/cover no-repeat url(${poster})` : "hsl(var(--muted))",
          }}
          aria-label="Tutorial video loading when scrolled into view"
        />
      )}
    </div>
  );
};

export default LazyVideo;
