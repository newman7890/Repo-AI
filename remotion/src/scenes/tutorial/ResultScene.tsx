import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../../MainVideo";
import { PhoneFrame } from "../IntroScene";

export const ResultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepIn = spring({ frame, fps, config: { damping: 18 } });
  const phoneIn = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 100 } });
  const revealIn = spring({ frame: frame - 20, fps, config: { damping: 22 } });

  // Slider sweep: starts at right (showing mostly "before" hidden, after visible), moves left and back
  // Position 0% = full before, 100% = full after. We'll animate 50 -> 90 -> 20 -> 60
  const sliderRaw = interpolate(
    frame,
    [30, 80, 120, 160, 200],
    [50, 88, 18, 65, 50],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Confetti / sparkles after reveal
  const sparkles = Array.from({ length: 10 }, (_, i) => {
    const start = 40 + i * 6;
    const t = Math.max(0, frame - start);
    const opacity = interpolate(t, [0, 10, 50], [0, 1, 0], { extrapolateRight: "clamp" });
    const y = interpolate(t, [0, 50], [0, -120]);
    return { i, opacity, y, x: -160 + i * 36 };
  });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 100, maxWidth: 1700, flexDirection: "row-reverse" }}>
        <div style={{ flex: 1, opacity: stepIn, transform: `translateX(${(1 - stepIn) * 40}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg, hsl(150, 70%, 50%), hsl(180, 80%, 55%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 32,
                fontFamily: fonts.display,
                fontWeight: 700,
                boxShadow: "0 12px 40px hsla(170, 80%, 55%, 0.4)",
              }}
            >
              4
            </div>
            <span style={{ color: "hsl(150, 70%, 60%)", fontSize: 24, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Step Four
            </span>
          </div>
          <h2 style={{ fontFamily: fonts.display, color: "white", fontSize: 110, lineHeight: 1, margin: 0, letterSpacing: -3, fontWeight: 700 }}>
            Slide.<br />Compare.<br />
            <span
              style={{
                background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(180, 80%, 55%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Save.
            </span>
          </h2>
          <p style={{ color: "hsl(220, 10%, 72%)", fontSize: 30, marginTop: 28, lineHeight: 1.4, maxWidth: 600 }}>
            Drag the slider to see before & after. Re-edit, undo or download in one tap.
          </p>
        </div>

        <div style={{ transform: `translateY(${(1 - phoneIn) * 60}px) scale(${0.7 + phoneIn * 0.3})`, opacity: phoneIn, position: "relative" }}>
          <PhoneFrame>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, hsl(250, 20%, 6%), hsl(270, 30%, 9%))", padding: "80px 20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Before/after slider */}
              <div style={{ flex: 1, borderRadius: 22, overflow: "hidden", position: "relative", border: "1px solid hsl(250, 15%, 18%)" }}>
                {/* AFTER (vintage polaroid) - full */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #c98a3a 0%, #d4a04a 40%, #a85a3a 100%)" }}>
                  <div style={{ position: "absolute", left: "50%", top: "55%", transform: "translate(-50%, -50%)", width: 110, height: 110, borderRadius: 55, background: "rgba(255,210,170,0.88)", boxShadow: "inset 0 -10px 30px rgba(120,60,20,0.4)" }} />
                  {/* film grain hint */}
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 60%)" }} />
                  <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.5)", color: "white", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>AFTER</div>
                </div>
                {/* BEFORE (clipped) */}
                <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - sliderRaw}% 0 0)`, background: "linear-gradient(135deg, #4a3a8a 0%, #b66a8a 40%, #d49a4a 100%)" }}>
                  <div style={{ position: "absolute", left: "50%", top: "55%", transform: "translate(-50%, -50%)", width: 110, height: 110, borderRadius: 55, background: "rgba(255,220,200,0.85)" }} />
                  <div style={{ position: "absolute", top: 12, left: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.5)", color: "white", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>BEFORE</div>
                </div>
                {/* Divider */}
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sliderRaw}%`, width: 2, background: "white", boxShadow: "0 0 12px rgba(255,255,255,0.6)", transform: "translateX(-50%)" }}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 36, height: 36, borderRadius: 18, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#222", fontWeight: 700, boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }}>
                    ⇄
                  </div>
                </div>

                {/* sparkles */}
                {frame > 40 && sparkles.map((s) => (
                  <div
                    key={s.i}
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: "30%",
                      transform: `translate(${s.x}px, ${s.y}px)`,
                      opacity: s.opacity,
                      fontSize: 18,
                    }}
                  >
                    ✨
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, opacity: revealIn, transform: `translateY(${(1 - revealIn) * 16}px)` }}>
                <div style={{ flex: 1, height: 48, borderRadius: 14, background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 15, fontWeight: 700 }}>
                  ⬇ Download
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "hsl(250, 15%, 14%)", border: "1px solid hsl(250, 15%, 22%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18 }}>
                  ✎
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "hsl(250, 15%, 14%)", border: "1px solid hsl(250, 15%, 22%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18 }}>
                  ↺
                </div>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};
