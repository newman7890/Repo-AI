import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../../MainVideo";

export const TutorialIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeIn = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const titleIn = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 110 } });
  const subIn = spring({ frame: frame - 24, fps, config: { damping: 200 } });
  const sparkle = Math.sin(frame / 8) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28, padding: 80 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 24px",
          borderRadius: 999,
          background: "hsla(270, 100%, 65%, 0.12)",
          border: "1px solid hsla(270, 100%, 65%, 0.35)",
          transform: `translateY(${(1 - badgeIn) * 30}px)`,
          opacity: badgeIn,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 5, background: "hsl(270, 100%, 70%)", boxShadow: `0 0 ${sparkle * 16}px hsl(270, 100%, 70%)` }} />
        <span style={{ color: "hsl(270, 100%, 82%)", fontSize: 24, fontWeight: 600, letterSpacing: 0.5 }}>
          How it works
        </span>
      </div>

      <h1
        style={{
          fontFamily: fonts.display,
          color: "white",
          fontSize: 150,
          lineHeight: 0.95,
          fontWeight: 700,
          margin: 0,
          letterSpacing: -4,
          textAlign: "center",
          transform: `translateY(${(1 - titleIn) * 60}px)`,
          opacity: titleIn,
        }}
      >
        From photo to{" "}
        <span
          style={{
            background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%), hsl(180, 80%, 55%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          masterpiece
        </span>
        <br />
        in 4 steps
      </h1>

      <p
        style={{
          color: "hsl(220, 10%, 70%)",
          fontSize: 34,
          margin: 0,
          marginTop: 12,
          textAlign: "center",
          opacity: subIn,
          transform: `translateY(${(1 - subIn) * 20}px)`,
        }}
      >
        Upload. Prompt. Generate. Done.
      </p>
    </AbsoluteFill>
  );
};
