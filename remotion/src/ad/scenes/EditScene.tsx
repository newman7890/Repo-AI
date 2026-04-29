import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { brand, fonts } from "../AdRoot";
import { useLayout } from "../util";

export const EditScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { min, isVertical, width, height } = useLayout();

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 22 } });
  const phoneIn = spring({ frame: frame - 16, fps, config: { damping: 18, stiffness: 120 } });

  // Typewriter prompt
  const promptText = "make it golden hour, cinematic";
  const charsShown = Math.min(promptText.length, Math.max(0, Math.floor((frame - 80) / 1.6)));
  const typed = promptText.slice(0, charsShown);

  // Processing bar
  const procStart = 80 + Math.ceil(promptText.length * 1.6) + 10;
  const procProgress = interpolate(frame, [procStart, procStart + 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const swap = interpolate(frame, [procStart + 70, procStart + 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phoneW = isVertical ? min * 0.75 : min * 0.5;
  const phoneH = phoneW * 1.9;

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
          marginBottom: min * 0.035,
          maxWidth: min * 1.4,
          lineHeight: 1.05,
        }}
      >
        Edit anything with{" "}
        <span style={{ color: brand.accent }}>just a prompt.</span>
      </div>

      {/* Phone frame */}
      <div
        style={{
          width: phoneW,
          height: phoneH,
          borderRadius: phoneW * 0.09,
          background: "#1a1422",
          border: `${phoneW * 0.012}px solid #2a2235`,
          padding: phoneW * 0.025,
          boxShadow: `0 30px 80px ${brand.primary}33, 0 0 0 1px ${brand.border}`,
          opacity: phoneIn,
          transform: `translateY(${(1 - phoneIn) * 60}px) scale(${0.92 + phoneIn * 0.08})`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Image area */}
        <div
          style={{
            width: "100%",
            height: "70%",
            borderRadius: phoneW * 0.06,
            overflow: "hidden",
            position: "relative",
            background: "#000",
          }}
        >
          <Img
            src={staticFile("ad/portrait-before.jpg")}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 1 - swap,
            }}
          />
          <Img
            src={staticFile("ad/portrait-after.jpg")}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: swap,
            }}
          />
          {/* Processing overlay */}
          {procProgress > 0 && procProgress < 1 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(${frame * 4}deg, ${brand.primary}55, ${brand.accent}55)`,
                mixBlendMode: "screen",
              }}
            />
          )}
        </div>

        {/* Prompt input */}
        <div
          style={{
            marginTop: phoneW * 0.04,
            padding: `${phoneW * 0.035}px ${phoneW * 0.04}px`,
            background: brand.surface,
            border: `1px solid ${brand.border}`,
            borderRadius: phoneW * 0.04,
            color: brand.ink,
            fontSize: phoneW * 0.04,
            display: "flex",
            alignItems: "center",
            gap: phoneW * 0.02,
            minHeight: phoneW * 0.12,
          }}
        >
          <span style={{ color: brand.accent, fontSize: phoneW * 0.045 }}>✦</span>
          <span>
            {typed}
            {frame % 30 < 15 && charsShown < promptText.length && (
              <span style={{ color: brand.accent }}>|</span>
            )}
          </span>
        </div>

        {/* Generate button / progress */}
        <div
          style={{
            marginTop: phoneW * 0.03,
            height: phoneW * 0.12,
            borderRadius: phoneW * 0.04,
            background: `linear-gradient(90deg, ${brand.primaryDeep}, ${brand.primary})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 600,
            fontSize: phoneW * 0.04,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {procProgress > 0 && procProgress < 1 ? (
            <>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${procProgress * 100}%`,
                  background: `linear-gradient(90deg, ${brand.accent}, ${brand.primary})`,
                }}
              />
              <span style={{ position: "relative", zIndex: 1 }}>Rendering… {Math.round(procProgress * 100)}%</span>
            </>
          ) : swap > 0.9 ? (
            <span>✓ Done</span>
          ) : (
            <span>Generate ✦</span>
          )}
        </div>
      </div>

      {/* Caption */}
      <div
        style={{
          marginTop: min * 0.035,
          fontSize: isVertical ? min * 0.028 : min * 0.022,
          color: brand.inkDim,
          textAlign: "center",
          opacity: swap,
        }}
      >
        Type what you want. Watch it happen in seconds.
      </div>
    </AbsoluteFill>
  );
};
