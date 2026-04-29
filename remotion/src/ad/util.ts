import { useVideoConfig } from "remotion";

// Responsive layout helpers. Aspect ratios supported: 16:9, 9:16, 1:1.
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const isVertical = height > width * 1.05;
  const isSquare = Math.abs(width - height) < 10;
  const isWide = width > height * 1.05;
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  return { width, height, isVertical, isSquare, isWide, min, max };
};

export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
