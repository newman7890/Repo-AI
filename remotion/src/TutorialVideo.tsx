import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { fonts } from "./MainVideo";
import { TutorialIntro } from "./scenes/tutorial/TutorialIntro";
import { UploadScene } from "./scenes/tutorial/UploadScene";
import { PromptScene } from "./scenes/tutorial/PromptScene";
import { ProcessingScene } from "./scenes/tutorial/ProcessingScene";
import { ResultScene } from "./scenes/tutorial/ResultScene";
import { TutorialOutro } from "./scenes/tutorial/TutorialOutro";

const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 1]);
  return (
    <AbsoluteFill style={{ background: "#08060f", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          top: -250 + drift * 100,
          left: -350 + drift * 140,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(270, 100%, 65%, 0.32) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          bottom: -400 - drift * 80,
          right: -400 - drift * 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(180, 80%, 55%, 0.22) 0%, transparent 70%)",
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
          opacity: 0.55,
        }}
      />
    </AbsoluteFill>
  );
};

export const TutorialVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: fonts.body }}>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <TutorialIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })} />

        <TransitionSeries.Sequence durationInFrames={170}>
          <UploadScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={170}>
          <PromptScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={170}>
          <ProcessingScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={210}>
          <ResultScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <TutorialOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
