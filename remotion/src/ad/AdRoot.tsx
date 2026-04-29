import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { RevealScene } from "./scenes/RevealScene";
import { EditScene } from "./scenes/EditScene";
import { FaceSwapScene } from "./scenes/FaceSwapScene";
import { PresetsScene } from "./scenes/PresetsScene";
import { BeforeAfterScene } from "./scenes/BeforeAfterScene";
import { CTAScene } from "./scenes/CTAScene";

const { fontFamily: display } = loadDisplay("normal", { weights: ["500", "700"], subsets: ["latin"] });
const { fontFamily: body } = loadBody("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

export const fonts = { display, body };

// Brand: Renderme — purple/violet primary with cyan accent on near-black
export const brand = {
  bg: "#08060f",
  ink: "#f5f1ff",
  inkDim: "rgba(245,241,255,0.62)",
  primary: "#A78BFA", // violet
  primaryDeep: "#7C3AED",
  accent: "#5EEAD4", // cyan
  warm: "#FCA5A5",
  surface: "rgba(255,255,255,0.06)",
  border: "rgba(167,139,250,0.25)",
};

const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 1]);
  const big = Math.max(width, height);
  return (
    <AbsoluteFill style={{ background: brand.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: big * 0.9,
          height: big * 0.9,
          top: -big * 0.2 + drift * 80,
          left: -big * 0.25 + drift * 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${brand.primary}55 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: big * 1.1,
          height: big * 1.1,
          bottom: -big * 0.35 - drift * 60,
          right: -big * 0.35 - drift * 100,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${brand.accent}33 0%, transparent 70%)`,
          filter: "blur(50px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(hsla(270, 30%, 50%, 0.06) 1px, transparent 1px), linear-gradient(90deg, hsla(270, 30%, 50%, 0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.5,
        }}
      />
      {/* vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, ${brand.bg} 100%)`,
          opacity: 0.7,
        }}
      />
    </AbsoluteFill>
  );
};

// Total: 60 + 75 + 90 + 90 + 90 + 75 + 90 + 75 = 645 frames at 30fps ~= 21.5s base
// Want ~90s = 2700 frames. Multiply scenes by ~4.2. Let's set:
// Scene durations sum target: 2700. Distribute by importance.
const D = {
  hook: 180,        // 6s
  problem: 240,     // 8s
  reveal: 300,      // 10s
  edit: 360,        // 12s
  faceswap: 360,    // 12s
  presets: 300,     // 10s
  beforeafter: 360, // 12s
  cta: 240,         // 8s
}; // sum = 2340 + 6 transitions of 18 overlap... 2340 + 0 = 2340. We'll make total = 2340 (78s).
// Per user: 1m30s = 90s = 2700. Let's bump CTA & reveal.
// Adjusted totals to 2700:
const SCENE_DUR = {
  hook: 210,
  problem: 270,
  reveal: 330,
  edit: 390,
  faceswap: 390,
  presets: 330,
  beforeafter: 390,
  cta: 390,
};

export const AD_TOTAL_FRAMES = Object.values(SCENE_DUR).reduce((a, b) => a + b, 0);
// = 2700 frames @ 30fps = 90 seconds

const transition = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
  />
);

const slideT = (
  <TransitionSeries.Transition
    presentation={slide({ direction: "from-right" })}
    timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
  />
);

export const AdMain: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: body, color: brand.ink }}>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.hook}>
          <HookScene />
        </TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.problem}>
          <ProblemScene />
        </TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.reveal}>
          <RevealScene />
        </TransitionSeries.Sequence>
        {slideT}
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.edit}>
          <EditScene />
        </TransitionSeries.Sequence>
        {slideT}
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.faceswap}>
          <FaceSwapScene />
        </TransitionSeries.Sequence>
        {slideT}
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.presets}>
          <PresetsScene />
        </TransitionSeries.Sequence>
        {slideT}
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.beforeafter}>
          <BeforeAfterScene />
        </TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={SCENE_DUR.cta}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
