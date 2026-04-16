import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../MainVideo";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeIn = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const titleIn = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 110 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 200 } });
  const phoneIn = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 90, mass: 1.2 } });

  const phoneFloat = Math.sin(frame / 18) * 8;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 100, maxWidth: 1600 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 999,
              background: "hsla(270, 100%, 65%, 0.12)",
              border: "1px solid hsla(270, 100%, 65%, 0.35)",
              transform: `translateY(${(1 - badgeIn) * 30}px)`,
              opacity: badgeIn,
              marginBottom: 32,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "hsl(270, 100%, 70%)" }} />
            <span style={{ color: "hsl(270, 100%, 80%)", fontSize: 22, fontWeight: 600, letterSpacing: 0.5 }}>
              30-second guide
            </span>
          </div>
          <h1
            style={{
              fontFamily: fonts.display,
              color: "white",
              fontSize: 130,
              lineHeight: 0.95,
              fontWeight: 700,
              margin: 0,
              letterSpacing: -3,
              transform: `translateY(${(1 - titleIn) * 60}px)`,
              opacity: titleIn,
            }}
          >
            Install
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%), hsl(180, 80%, 55%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Renderme AI
            </span>
            <br />
            on your phone
          </h1>
          <p
            style={{
              color: "hsl(220, 10%, 70%)",
              fontSize: 32,
              marginTop: 32,
              lineHeight: 1.4,
              maxWidth: 700,
              opacity: subIn,
              transform: `translateY(${(1 - subIn) * 20}px)`,
            }}
          >
            No app store. No download. Just two taps and you're in.
          </p>
        </div>

        {/* Phone mockup */}
        <div
          style={{
            transform: `translateY(${(1 - phoneIn) * 80 + phoneFloat}px) scale(${0.6 + phoneIn * 0.4})`,
            opacity: phoneIn,
          }}
        >
          <PhoneFrame>
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(160deg, hsl(250, 20%, 6%), hsl(270, 30%, 10%))",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                padding: 40,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 28,
                  background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%), hsl(180, 80%, 55%))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 20px 60px hsla(270, 100%, 65%, 0.5)",
                }}
              >
                <span style={{ fontSize: 70 }}>✨</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "white", fontFamily: fonts.display, fontSize: 32, fontWeight: 700 }}>Renderme AI</div>
                <div style={{ color: "hsl(220, 10%, 60%)", fontSize: 18, marginTop: 8 }}>AI photo magic</div>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        width: 380,
        height: 760,
        borderRadius: 56,
        background: "linear-gradient(180deg, #1a1a24, #0a0a12)",
        padding: 12,
        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 2px hsl(270, 30%, 25%)",
        position: "relative",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 46, overflow: "hidden", position: "relative" }}>
        {children}
        {/* notch */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 28,
            background: "#000",
            borderRadius: 16,
          }}
        />
      </div>
    </div>
  );
};
