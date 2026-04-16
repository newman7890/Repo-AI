import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../MainVideo";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const ctaIn = spring({ frame: frame - 18, fps, config: { damping: 18 } });
  const sparkle = Math.sin(frame / 6) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 44,
          background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%), hsl(180, 80%, 55%))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 100,
          boxShadow: `0 30px 80px hsla(270, 100%, 65%, ${sparkle * 0.6})`,
          transform: `scale(${0.5 + titleIn * 0.5})`,
          opacity: titleIn,
        }}
      >
        ✨
      </div>

      <h1
        style={{
          fontFamily: fonts.display,
          color: "white",
          fontSize: 130,
          fontWeight: 700,
          margin: 0,
          letterSpacing: -3,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 30}px)`,
          textAlign: "center",
        }}
      >
        You're all set.
      </h1>
      <p
        style={{
          color: "hsl(220, 10%, 70%)",
          fontSize: 36,
          margin: 0,
          opacity: ctaIn,
          textAlign: "center",
        }}
      >
        Open Renderme from your home screen and start creating.
      </p>

      <div
        style={{
          marginTop: 30,
          padding: "20px 50px",
          borderRadius: 999,
          background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%))",
          color: "white",
          fontSize: 30,
          fontWeight: 700,
          fontFamily: fonts.display,
          opacity: ctaIn,
          transform: `translateY(${(1 - ctaIn) * 20}px) scale(${ctaIn})`,
          boxShadow: "0 20px 50px hsla(270, 100%, 65%, 0.4)",
        }}
      >
        renderme-ai.lovable.app
      </div>
    </AbsoluteFill>
  );
};
