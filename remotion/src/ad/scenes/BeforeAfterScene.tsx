import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { brand, fonts } from "../AdRoot";
import { useLayout } from "../util";

export const BeforeAfterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { min, isVertical } = useLayout();

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 22 } });
  const cardIn = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 120 } });

  // Slider sweeps from left to right, then back
  const sweep1 = interpolate(frame, [50, 170], [0.1, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweep2 = interpolate(frame, [200, 320], [0.9, 0.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sliderPos = frame < 185 ? sweep1 : sweep2;

  const cardW = isVertical ? min * 0.85 : min * 0.7;
  const cardH = cardW * 0.75;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: min * 0.04 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: isVertical ? min * 0.06 : min * 0.05,
          fontWeight: 700,
          letterSpacing: -1,
          textAlign: "center",
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 20}px)`,
          marginBottom: min * 0.04,
          maxWidth: min * 1.4,
          lineHeight: 1.05,
        }}
      >
        Compare <span style={{ color: brand.accent }}>before</span> &{" "}
        <span style={{ color: brand.primary }}>after</span>.
      </div>

      <div
        style={{
          width: cardW,
          height: cardH,
          borderRadius: cardW * 0.03,
          overflow: "hidden",
          position: "relative",
          border: `1px solid ${brand.border}`,
          boxShadow: `0 30px 80px ${brand.primary}44`,
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 50}px) scale(${0.94 + cardIn * 0.06})`,
        }}
      >
        {/* AFTER (full) */}
        <Img
          src={staticFile("ad/room-after.jpg")}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* BEFORE clipped */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0 ${(1 - sliderPos) * 100}% 0 0)`,
          }}
        >
          <Img
            src={staticFile("ad/room-before.jpg")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Labels */}
        <div
          style={{
            position: "absolute",
            top: cardW * 0.03,
            left: cardW * 0.03,
            padding: `${cardW * 0.012}px ${cardW * 0.025}px`,
            borderRadius: cardW * 0.015,
            background: "rgba(0,0,0,0.5)",
            color: brand.warm,
            fontSize: cardW * 0.022,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Before
        </div>
        <div
          style={{
            position: "absolute",
            top: cardW * 0.03,
            right: cardW * 0.03,
            padding: `${cardW * 0.012}px ${cardW * 0.025}px`,
            borderRadius: cardW * 0.015,
            background: brand.primary,
            color: "white",
            fontSize: cardW * 0.022,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          After
        </div>

        {/* Slider line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sliderPos * 100}%`,
            width: 3,
            background: brand.ink,
            boxShadow: `0 0 20px ${brand.ink}`,
            transform: "translateX(-1.5px)",
          }}
        />
        {/* Slider handle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${sliderPos * 100}%`,
            width: cardW * 0.06,
            height: cardW * 0.06,
            borderRadius: "50%",
            background: brand.ink,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 30px ${brand.primary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: brand.bg,
            fontWeight: 700,
            fontSize: cardW * 0.025,
          }}
        >
          ⟷
        </div>
      </div>

      <div
        style={{
          marginTop: min * 0.04,
          fontSize: isVertical ? min * 0.028 : min * 0.022,
          color: brand.inkDim,
          textAlign: "center",
        }}
      >
        Built-in slider • Undo / Redo • History gallery
      </div>
    </AbsoluteFill>
  );
};
