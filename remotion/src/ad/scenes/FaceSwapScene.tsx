import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { brand, fonts } from "../AdRoot";
import { useLayout } from "../util";

export const FaceSwapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { min, isVertical } = useLayout();

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 22 } });
  const sourceIn = spring({ frame: frame - 24, fps, config: { damping: 18 } });
  const targetIn = spring({ frame: frame - 48, fps, config: { damping: 18 } });
  const beam = interpolate(frame, [110, 170], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reveal = interpolate(frame, [180, 230], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cardSize = isVertical ? min * 0.42 : min * 0.32;
  const arrow = isVertical ? "↓" : "→";

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
        <span style={{ color: brand.primary }}>Face swap</span> into anything.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          alignItems: "center",
          gap: min * 0.04,
        }}
      >
        {/* Source */}
        <div style={{ position: "relative", opacity: sourceIn, transform: `scale(${0.85 + sourceIn * 0.15})` }}>
          <PhotoCard src="ad/face-source.jpg" size={cardSize} label="Your face" tone={brand.accent} />
        </div>

        <div
          style={{
            fontSize: cardSize * 0.25,
            color: brand.primary,
            opacity: Math.min(sourceIn, targetIn),
            textShadow: `0 0 30px ${brand.primary}`,
          }}
        >
          {arrow}
        </div>

        {/* Target with reveal */}
        <div style={{ position: "relative", opacity: targetIn, transform: `scale(${0.85 + targetIn * 0.15})` }}>
          <div
            style={{
              width: cardSize,
              height: cardSize * 1.25,
              borderRadius: cardSize * 0.06,
              overflow: "hidden",
              position: "relative",
              border: `2px solid ${brand.border}`,
              boxShadow: `0 20px 60px ${brand.primary}33`,
            }}
          >
            <Img
              src={staticFile("ad/face-target.jpg")}
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: reveal < 1 ? `brightness(${0.5 + reveal * 0.5})` : "none" }}
            />
            {/* Scanning beam */}
            {beam > 0 && beam < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${beam * 100}%`,
                  height: 4,
                  background: `linear-gradient(90deg, transparent, ${brand.accent}, transparent)`,
                  boxShadow: `0 0 20px ${brand.accent}`,
                }}
              />
            )}
            {/* Result label */}
            <div
              style={{
                position: "absolute",
                bottom: cardSize * 0.04,
                left: cardSize * 0.04,
                padding: `${cardSize * 0.018}px ${cardSize * 0.04}px`,
                borderRadius: cardSize * 0.03,
                background: brand.primary,
                color: "white",
                fontSize: cardSize * 0.06,
                fontWeight: 600,
                opacity: reveal,
              }}
            >
              ✓ Knight
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: min * 0.045,
          fontSize: isVertical ? min * 0.028 : min * 0.022,
          color: brand.inkDim,
          textAlign: "center",
          opacity: reveal,
          maxWidth: min * 1.4,
        }}
      >
        Up to 4 faces at once — natural lighting, real results.
      </div>
    </AbsoluteFill>
  );
};

const PhotoCard: React.FC<{ src: string; size: number; label: string; tone: string }> = ({ src, size, label, tone }) => (
  <div
    style={{
      width: size,
      height: size * 1.25,
      borderRadius: size * 0.06,
      overflow: "hidden",
      position: "relative",
      border: `2px solid ${brand.border}`,
      boxShadow: `0 20px 60px ${tone}33`,
    }}
  >
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <div
      style={{
        position: "absolute",
        bottom: size * 0.04,
        left: size * 0.04,
        padding: `${size * 0.018}px ${size * 0.04}px`,
        borderRadius: size * 0.03,
        background: brand.surface,
        backdropFilter: "blur(10px)",
        border: `1px solid ${brand.border}`,
        color: tone,
        fontSize: size * 0.06,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  </div>
);
