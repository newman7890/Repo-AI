import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../../MainVideo";
import { PhoneFrame } from "../IntroScene";

const PROMPT = "Make it a vintage 1970s polaroid with warm tones";

export const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepIn = spring({ frame, fps, config: { damping: 18 } });
  const phoneIn = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 100, mass: 1.1 } });

  // Typewriter
  const typeStart = 30;
  const charsPerFrame = 0.7;
  const charCount = Math.max(0, Math.min(PROMPT.length, Math.floor((frame - typeStart) * charsPerFrame)));
  const typed = PROMPT.slice(0, charCount);
  const caretBlink = Math.floor(frame / 8) % 2 === 0;

  // Quick presets pop in
  const presetsIn = spring({ frame: frame - 14, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 100, maxWidth: 1700, flexDirection: "row-reverse" }}>
        {/* Right (visually left): copy */}
        <div style={{ flex: 1, opacity: stepIn, transform: `translateX(${(1 - stepIn) * 40}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg, hsl(180, 80%, 55%), hsl(200, 90%, 60%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 32,
                fontFamily: fonts.display,
                fontWeight: 700,
                boxShadow: "0 12px 40px hsla(180, 80%, 55%, 0.4)",
              }}
            >
              2
            </div>
            <span style={{ color: "hsl(270, 100%, 75%)", fontSize: 24, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Step Two
            </span>
          </div>
          <h2 style={{ fontFamily: fonts.display, color: "white", fontSize: 110, lineHeight: 1, margin: 0, letterSpacing: -3, fontWeight: 700 }}>
            Describe<br />the magic
          </h2>
          <p style={{ color: "hsl(220, 10%, 72%)", fontSize: 30, marginTop: 28, lineHeight: 1.4, maxWidth: 600 }}>
            Type any edit — change clothes, swap backgrounds, add lighting. Or pick a one-tap preset.
          </p>
        </div>

        {/* Phone */}
        <div style={{ transform: `translateY(${(1 - phoneIn) * 60}px) scale(${0.7 + phoneIn * 0.3})`, opacity: phoneIn }}>
          <PhoneFrame>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, hsl(250, 20%, 6%), hsl(270, 30%, 9%))", padding: "80px 24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Mini photo preview */}
              <div style={{ height: 220, borderRadius: 18, background: "linear-gradient(135deg, #4a3a8a 0%, #b66a8a 40%, #d49a4a 100%)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "50%", bottom: 38, transform: "translateX(-50%)", width: 70, height: 70, borderRadius: 35, background: "rgba(255,220,200,0.85)" }} />
              </div>

              {/* Prompt input */}
              <div style={{ borderRadius: 18, background: "hsl(250, 15%, 11%)", border: "1.5px solid hsl(270, 100%, 60%)", padding: 16, minHeight: 120, boxShadow: "0 0 24px hsla(270, 100%, 65%, 0.25)" }}>
                <div style={{ color: "hsl(220, 10%, 50%)", fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Prompt</div>
                <div style={{ color: "white", fontSize: 17, lineHeight: 1.4, fontFamily: fonts.body, minHeight: 60 }}>
                  {typed}
                  <span style={{ opacity: caretBlink ? 1 : 0, color: "hsl(270, 100%, 70%)", fontWeight: 700 }}>|</span>
                </div>
              </div>

              {/* Quick presets */}
              <div style={{ opacity: presetsIn, transform: `translateY(${(1 - presetsIn) * 20}px)` }}>
                <div style={{ color: "hsl(220, 10%, 60%)", fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Quick presets</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["✨ Glow up", "🎨 Anime", "📸 Studio", "🌃 Neon"].map((p, i) => {
                    const chipIn = spring({ frame: frame - 18 - i * 4, fps, config: { damping: 18 } });
                    return (
                      <div
                        key={p}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 999,
                          background: "hsla(270, 100%, 65%, 0.14)",
                          border: "1px solid hsla(270, 100%, 65%, 0.3)",
                          color: "hsl(270, 100%, 85%)",
                          fontSize: 13,
                          fontWeight: 600,
                          opacity: chipIn,
                          transform: `scale(${0.6 + chipIn * 0.4})`,
                        }}
                      >
                        {p}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: "auto", height: 56, borderRadius: 16, background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 18 }}>
                Generate ✨
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};
