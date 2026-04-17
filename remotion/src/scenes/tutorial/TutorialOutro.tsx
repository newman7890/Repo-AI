import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { fonts } from "../../MainVideo";

export const TutorialOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 18 } });
  const ctaIn = spring({ frame: frame - 26, fps, config: { damping: 18 } });
  const glow = Math.sin(frame / 7) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 36, padding: 80 }}>
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: 50,
          background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%), hsl(180, 80%, 55%))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
          boxShadow: `0 30px 80px hsla(270, 100%, 65%, ${glow * 0.7})`,
          transform: `scale(${0.5 + logoIn * 0.5}) rotate(${(1 - logoIn) * -20}deg)`,
          opacity: logoIn,
        }}
      >
        ✨
      </div>

      <h1
        style={{
          fontFamily: fonts.display,
          color: "white",
          fontSize: 140,
          fontWeight: 700,
          margin: 0,
          letterSpacing: -4,
          textAlign: "center",
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 30}px)`,
        }}
      >
        Now it's{" "}
        <span
          style={{
            background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(180, 80%, 55%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          your turn.
        </span>
      </h1>

      <p style={{ color: "hsl(220, 10%, 72%)", fontSize: 34, margin: 0, textAlign: "center", opacity: ctaIn }}>
        Try Renderme AI free — no signup needed.
      </p>

      <div
        style={{
          marginTop: 12,
          padding: "22px 56px",
          borderRadius: 999,
          background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%))",
          color: "white",
          fontSize: 32,
          fontWeight: 700,
          fontFamily: fonts.display,
          opacity: ctaIn,
          transform: `translateY(${(1 - ctaIn) * 20}px) scale(${0.8 + ctaIn * 0.2})`,
          boxShadow: `0 20px 60px hsla(270, 100%, 65%, ${glow * 0.5})`,
        }}
      >
        renderme.site
      </div>
    </AbsoluteFill>
  );
};
