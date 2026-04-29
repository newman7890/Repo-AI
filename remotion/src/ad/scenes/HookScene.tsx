import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { brand, fonts } from "../AdRoot";
import { useLayout } from "../util";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { isVertical, min } = useLayout();

  const tagIn = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 180 } });
  const headlineIn = spring({ frame: frame - 22, fps, config: { damping: 18, stiffness: 140 } });
  const subIn = spring({ frame: frame - 60, fps, config: { damping: 22 } });

  const headlineSize = isVertical ? min * 0.13 : min * 0.18;
  const tagSize = isVertical ? min * 0.028 : min * 0.022;
  const subSize = isVertical ? min * 0.034 : min * 0.028;

  // Headline morphs: "ordinary" -> "extraordinary"
  const wordPhase = Math.floor((frame / 90) % 2);
  const swap = spring({ frame: frame - 90, fps, config: { damping: 20 } });
  const swapBack = spring({ frame: frame - 150, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: min * 0.06 }}>
      <div
        style={{
          opacity: tagIn,
          transform: `translateY(${(1 - tagIn) * 20}px)`,
          padding: `${min * 0.012}px ${min * 0.028}px`,
          borderRadius: 999,
          border: `1px solid ${brand.border}`,
          background: brand.surface,
          color: brand.primary,
          fontSize: tagSize,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: min * 0.04,
        }}
      >
        ✦ Renderme AI
      </div>

      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: headlineSize,
          lineHeight: 0.95,
          textAlign: "center",
          letterSpacing: -2,
          opacity: headlineIn,
          transform: `translateY(${(1 - headlineIn) * 40}px) scale(${0.94 + headlineIn * 0.06})`,
        }}
      >
        Turn{" "}
        <span style={{ position: "relative", display: "inline-block" }}>
          <span
            style={{
              opacity: 1 - swap + swapBack,
              display: "inline-block",
              color: brand.inkDim,
              textDecoration: "line-through",
              textDecorationColor: brand.warm,
              textDecorationThickness: 6,
            }}
          >
            ordinary
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              opacity: swap - swapBack,
              background: `linear-gradient(120deg, ${brand.primary}, ${brand.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            unreal
          </span>
        </span>
        <br />
        photos into art.
      </div>

      <div
        style={{
          opacity: subIn,
          transform: `translateY(${(1 - subIn) * 20}px)`,
          marginTop: min * 0.05,
          fontSize: subSize,
          color: brand.inkDim,
          textAlign: "center",
          maxWidth: min * 1.3,
        }}
      >
        AI photo editing that feels like magic — right in your pocket.
      </div>
    </AbsoluteFill>
  );
};
