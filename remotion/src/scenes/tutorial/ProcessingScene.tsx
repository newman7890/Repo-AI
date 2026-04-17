import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../../MainVideo";
import { PhoneFrame } from "../IntroScene";

export const ProcessingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepIn = spring({ frame, fps, config: { damping: 18 } });
  const phoneIn = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 100 } });

  // Spinner
  const rotation = (frame * 6) % 360;
  // Status text cycles
  const statuses = ["Analyzing image...", "Applying style...", "Rendering details...", "Almost there..."];
  const statusIdx = Math.min(statuses.length - 1, Math.floor(frame / 36));
  // Progress
  const progress = interpolate(frame, [10, 150], [4, 96], { extrapolateRight: "clamp" });

  // Particles
  const particles = Array.from({ length: 14 }, (_, i) => {
    const seed = i * 0.7;
    const phase = (frame / 30 + seed) % 2;
    const py = interpolate(phase, [0, 1, 2], [0, -180, -360]);
    const opacity = interpolate(phase, [0, 0.2, 1.4, 2], [0, 1, 1, 0]);
    const x = Math.sin((frame + i * 30) / 20) * 18;
    return { i, py, opacity, x, left: 12 + i * 22 };
  });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 100, maxWidth: 1700 }}>
        <div style={{ flex: 1, opacity: stepIn, transform: `translateX(${(1 - stepIn) * -40}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg, hsl(280, 100%, 72%), hsl(320, 90%, 65%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 32,
                fontFamily: fonts.display,
                fontWeight: 700,
                boxShadow: "0 12px 40px hsla(290, 100%, 65%, 0.4)",
              }}
            >
              3
            </div>
            <span style={{ color: "hsl(180, 80%, 60%)", fontSize: 24, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Step Three
            </span>
          </div>
          <h2 style={{ fontFamily: fonts.display, color: "white", fontSize: 110, lineHeight: 1, margin: 0, letterSpacing: -3, fontWeight: 700 }}>
            AI does<br />the work
          </h2>
          <p style={{ color: "hsl(220, 10%, 72%)", fontSize: 30, marginTop: 28, lineHeight: 1.4, maxWidth: 600 }}>
            Our pipeline reads your photo, plans the edit and renders pixel-perfect results in seconds.
          </p>
        </div>

        <div style={{ transform: `translateY(${(1 - phoneIn) * 60}px) scale(${0.7 + phoneIn * 0.3})`, opacity: phoneIn }}>
          <PhoneFrame>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, hsl(250, 20%, 6%), hsl(270, 35%, 11%))", padding: "80px 28px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, position: "relative", overflow: "hidden" }}>
              {/* particles */}
              {particles.map((p) => (
                <div
                  key={p.i}
                  style={{
                    position: "absolute",
                    bottom: 80,
                    left: p.left,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: p.i % 2 === 0 ? "hsl(270, 100%, 70%)" : "hsl(180, 80%, 60%)",
                    transform: `translate(${p.x}px, ${p.py}px)`,
                    opacity: p.opacity,
                    boxShadow: `0 0 12px currentColor`,
                  }}
                />
              ))}

              {/* spinner */}
              <div style={{ position: "relative", width: 180, height: 180 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 90,
                    border: "6px solid hsla(270, 100%, 65%, 0.15)",
                    borderTopColor: "hsl(270, 100%, 65%)",
                    borderRightColor: "hsl(280, 100%, 72%)",
                    transform: `rotate(${rotation}deg)`,
                    boxShadow: "0 0 40px hsla(270, 100%, 65%, 0.4)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 24,
                    borderRadius: 70,
                    border: "4px solid hsla(180, 80%, 55%, 0.15)",
                    borderBottomColor: "hsl(180, 80%, 55%)",
                    transform: `rotate(${-rotation * 1.4}deg)`,
                  }}
                />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 }}>✨</div>
              </div>

              <div style={{ color: "white", fontFamily: fonts.display, fontSize: 24, fontWeight: 700, textAlign: "center" }}>
                {statuses[statusIdx]}
              </div>

              {/* progress */}
              <div style={{ width: "100%", height: 8, borderRadius: 4, background: "hsl(250, 15%, 14%)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, hsl(270, 100%, 65%), hsl(180, 80%, 55%))", boxShadow: "0 0 12px hsl(270, 100%, 65%)" }} />
              </div>
              <div style={{ color: "hsl(220, 10%, 60%)", fontSize: 14, fontWeight: 600 }}>{Math.round(progress)}%</div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};
