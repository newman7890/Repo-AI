import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Img, staticFile } from "remotion";
import { brand, fonts } from "../AdRoot";
import { useLayout } from "../util";

const PRESETS = [
  { src: "ad/preset-vintage.jpg", label: "Vintage", tone: "#E8C49A" },
  { src: "ad/preset-cyber.jpg", label: "Cyberpunk", tone: "#FF6BD8" },
  { src: "ad/preset-anime.jpg", label: "Cartoon", tone: "#5EEAD4" },
  { src: "ad/preset-oil.jpg", label: "Oil Paint", tone: "#FCA5A5" },
];

export const PresetsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { min, isVertical } = useLayout();

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 22 } });

  const cardSize = isVertical ? min * 0.4 : min * 0.28;

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
          marginBottom: min * 0.05,
          maxWidth: min * 1.4,
          lineHeight: 1.05,
        }}
      >
        Or pick a <span style={{ color: brand.primary }}>preset</span>.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isVertical ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
          gap: min * 0.03,
        }}
      >
        {PRESETS.map((p, i) => {
          const cardIn = spring({ frame: frame - (24 + i * 14), fps, config: { damping: 16, stiffness: 140 } });
          const float = Math.sin((frame + i * 30) / 24) * 6;
          return (
            <div
              key={p.label}
              style={{
                width: cardSize,
                opacity: cardIn,
                transform: `translateY(${(1 - cardIn) * 60 + float}px) scale(${0.85 + cardIn * 0.15})`,
              }}
            >
              <div
                style={{
                  width: cardSize,
                  height: cardSize * 1.2,
                  borderRadius: cardSize * 0.06,
                  overflow: "hidden",
                  border: `2px solid ${p.tone}55`,
                  boxShadow: `0 18px 50px ${p.tone}33`,
                  background: "#000",
                }}
              >
                <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div
                style={{
                  marginTop: cardSize * 0.04,
                  textAlign: "center",
                  fontSize: cardSize * 0.085,
                  fontWeight: 600,
                  color: p.tone,
                  letterSpacing: 0.5,
                }}
              >
                {p.label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: min * 0.05,
          fontSize: isVertical ? min * 0.028 : min * 0.022,
          color: brand.inkDim,
          textAlign: "center",
          opacity: spring({ frame: frame - 120, fps, config: { damping: 22 } }),
        }}
      >
        Dozens of styles. One tap. Endless variations.
      </div>
    </AbsoluteFill>
  );
};
