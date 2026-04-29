import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { brand, fonts } from "../AdRoot";
import { useLayout } from "../util";

export const RevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { min, isVertical } = useLayout();

  const flash = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 200 } });
  const wordIn = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 140 } });
  const subIn = spring({ frame: frame - 70, fps, config: { damping: 22 } });
  const orbScale = spring({ frame: frame - 30, fps, config: { damping: 16 } });

  const headSize = isVertical ? min * 0.16 : min * 0.18;
  const subSize = isVertical ? min * 0.035 : min * 0.028;

  // pulsing orb
  const pulse = 1 + Math.sin(frame / 8) * 0.04;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: min * 0.06 }}>
      {/* flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at center, ${brand.primary}, transparent 60%)`,
          opacity: Math.max(0, 0.6 - flash * 0.6),
        }}
      />

      {/* orb */}
      <div
        style={{
          position: "absolute",
          width: min * 0.5 * orbScale * pulse,
          height: min * 0.5 * orbScale * pulse,
          borderRadius: "50%",
          background: `conic-gradient(from ${frame * 2}deg, ${brand.primary}, ${brand.accent}, ${brand.primaryDeep}, ${brand.primary})`,
          filter: "blur(60px)",
          opacity: 0.5,
        }}
      />

      <div
        style={{
          fontFamily: fonts.display,
          fontSize: isVertical ? min * 0.03 : min * 0.024,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: brand.accent,
          opacity: wordIn,
          marginBottom: min * 0.02,
        }}
      >
        Now there's
      </div>

      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: headSize,
          lineHeight: 0.95,
          letterSpacing: -3,
          opacity: wordIn,
          transform: `scale(${0.7 + wordIn * 0.3})`,
          background: `linear-gradient(135deg, ${brand.ink} 0%, ${brand.primary} 50%, ${brand.accent} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textAlign: "center",
        }}
      >
        Renderme.
      </div>

      <div
        style={{
          fontSize: subSize,
          color: brand.inkDim,
          textAlign: "center",
          maxWidth: min * 1.4,
          marginTop: min * 0.04,
          opacity: subIn,
          transform: `translateY(${(1 - subIn) * 16}px)`,
        }}
      >
        One prompt. One tap. Studio-grade results — powered by next-gen AI.
      </div>
    </AbsoluteFill>
  );
};
