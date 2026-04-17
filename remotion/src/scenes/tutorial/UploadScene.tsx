import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { fonts } from "../../MainVideo";
import { PhoneFrame } from "../IntroScene";

export const UploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stepIn = spring({ frame, fps, config: { damping: 18 } });
  const phoneIn = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 100, mass: 1.1 } });

  // Cursor moves toward the upload zone, then taps
  const cursorX = interpolate(frame, [20, 70], [320, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [20, 70], [620, 380], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tapPulse = frame >= 70 && frame <= 90 ? 1 - (frame - 70) / 20 : 0;

  // Photo "drops in" after tap
  const photoIn = spring({ frame: frame - 92, fps, config: { damping: 14, stiffness: 110 } });
  const showPhoto = frame >= 92;

  // Progress bar fills
  const progress = interpolate(frame, [100, 150], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 100, maxWidth: 1700 }}>
        {/* Left: copy */}
        <div style={{ flex: 1, opacity: stepIn, transform: `translateX(${(1 - stepIn) * -40}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(280, 100%, 72%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 32,
                fontFamily: fonts.display,
                fontWeight: 700,
                boxShadow: "0 12px 40px hsla(270, 100%, 65%, 0.4)",
              }}
            >
              1
            </div>
            <span style={{ color: "hsl(180, 80%, 60%)", fontSize: 24, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Step One
            </span>
          </div>
          <h2 style={{ fontFamily: fonts.display, color: "white", fontSize: 110, lineHeight: 1, margin: 0, letterSpacing: -3, fontWeight: 700 }}>
            Upload<br />a photo
          </h2>
          <p style={{ color: "hsl(220, 10%, 72%)", fontSize: 30, marginTop: 28, lineHeight: 1.4, maxWidth: 600 }}>
            Tap to choose any picture from your gallery — or snap a fresh one with the camera.
          </p>
        </div>

        {/* Right: phone */}
        <div style={{ transform: `translateY(${(1 - phoneIn) * 60}px) scale(${0.7 + phoneIn * 0.3})`, opacity: phoneIn, position: "relative" }}>
          <PhoneFrame>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, hsl(250, 20%, 6%), hsl(270, 30%, 9%))", padding: "80px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ color: "white", fontFamily: fonts.display, fontSize: 26, fontWeight: 700 }}>Renderme AI</div>

              {/* Upload dropzone */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 24,
                  border: "2px dashed hsla(270, 100%, 70%, 0.6)",
                  background: showPhoto ? "transparent" : "hsla(270, 100%, 65%, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 16,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {!showPhoto && (
                  <>
                    <div style={{ fontSize: 64 }}>📷</div>
                    <div style={{ color: "hsl(220, 10%, 80%)", fontSize: 18, fontWeight: 600, textAlign: "center" }}>
                      Tap to upload<br />or take a photo
                    </div>
                  </>
                )}
                {showPhoto && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      transform: `scale(${0.6 + photoIn * 0.4})`,
                      opacity: photoIn,
                      background: "linear-gradient(135deg, #4a3a8a 0%, #b66a8a 40%, #d49a4a 100%)",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      padding: 14,
                    }}
                  >
                    {/* faux portrait */}
                    <div style={{ width: 90, height: 90, borderRadius: 45, background: "rgba(255,220,200,0.85)", marginBottom: 70 }} />
                    <div style={{ position: "absolute", bottom: 18, left: 18, color: "white", fontSize: 14, fontWeight: 600, background: "rgba(0,0,0,0.4)", padding: "4px 10px", borderRadius: 12 }}>
                      photo.jpg
                    </div>
                    {/* progress bar */}
                    {progress > 0 && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "rgba(0,0,0,0.3)" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, hsl(270, 100%, 65%), hsl(180, 80%, 55%))" }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ height: 56, borderRadius: 16, background: "hsl(250, 15%, 14%)", border: "1px solid hsl(250, 15%, 20%)" }} />
              <div style={{ height: 56, borderRadius: 16, background: "hsl(270, 100%, 65%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 18 }}>
                Generate ✨
              </div>
            </div>
          </PhoneFrame>

          {/* Cursor */}
          {frame >= 16 && frame <= 95 && (
            <div
              style={{
                position: "absolute",
                left: cursorX,
                top: cursorY,
                width: 36,
                height: 36,
                pointerEvents: "none",
              }}
            >
              {tapPulse > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: -20,
                    top: -20,
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    border: "3px solid hsl(270, 100%, 70%)",
                    opacity: tapPulse * 0.8,
                    transform: `scale(${1 + (1 - tapPulse) * 0.6})`,
                  }}
                />
              )}
              <svg viewBox="0 0 24 24" width="36" height="36">
                <path d="M3 2 L3 18 L8 14 L11 21 L14 20 L11 13 L18 13 Z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
