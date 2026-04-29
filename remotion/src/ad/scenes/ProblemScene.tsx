import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { brand, fonts } from "../AdRoot";
import { useLayout } from "../util";

const PainItem: React.FC<{ text: string; delay: number; struck: boolean }> = ({ text, delay, struck }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { min, isVertical } = useLayout();
  const inAnim = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const strike = spring({ frame: frame - (delay + 90), fps, config: { damping: 22 } });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: min * 0.02,
        padding: `${min * 0.018}px ${min * 0.028}px`,
        borderRadius: min * 0.02,
        background: brand.surface,
        border: `1px solid ${brand.border}`,
        opacity: inAnim,
        transform: `translateX(${(1 - inAnim) * -40}px)`,
        fontSize: isVertical ? min * 0.04 : min * 0.03,
        fontWeight: 500,
        position: "relative",
        overflow: "hidden",
        width: isVertical ? "100%" : "auto",
      }}
    >
      <span style={{ fontSize: "1.2em" }}>{struck ? "✕" : "•"}</span>
      <span
        style={{
          color: struck ? brand.inkDim : brand.ink,
          textDecoration: struck && strike > 0.3 ? "line-through" : "none",
          textDecorationColor: brand.warm,
          textDecorationThickness: 3,
        }}
      >
        {text}
      </span>
      {struck && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${strike * 100}%`,
            background: `linear-gradient(90deg, ${brand.warm}22, transparent)`,
          }}
        />
      )}
    </div>
  );
};

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { min, isVertical } = useLayout();

  const titleIn = spring({ frame: frame - 6, fps, config: { damping: 20 } });
  const titleSize = isVertical ? min * 0.075 : min * 0.075;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: min * 0.06 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: titleSize,
          textAlign: "center",
          letterSpacing: -1.5,
          lineHeight: 1.05,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 30}px)`,
          marginBottom: min * 0.06,
        }}
      >
        Editing photos used to mean…
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: min * 0.022,
          alignItems: isVertical ? "stretch" : "center",
          width: isVertical ? "100%" : "auto",
          maxWidth: min * 1.4,
        }}
      >
        <PainItem text="Hours in Photoshop" delay={30} struck />
        <PainItem text="Expensive subscriptions" delay={60} struck />
        <PainItem text="Steep learning curves" delay={90} struck />
        <PainItem text="Mediocre results" delay={120} struck />
      </div>
    </AbsoluteFill>
  );
};
