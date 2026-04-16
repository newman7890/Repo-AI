import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { fonts } from "../MainVideo";
import { PhoneFrame } from "./IntroScene";

const STEPS = [
  { title: "Open in Safari", desc: "Visit renderme-ai.lovable.app", icon: "🧭" },
  { title: "Tap the Share button", desc: "Bottom toolbar, square with ↑", icon: "📤" },
  { title: "Add to Home Screen", desc: "Scroll down in the share menu", icon: "➕" },
  { title: "Tap 'Add'", desc: "Top right — you're done!", icon: "✅" },
];

export const IOSScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, config: { damping: 18 } });

  // active step changes every ~60 frames
  const activeStep = Math.min(3, Math.floor(frame / 60));

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 120, maxWidth: 1700, width: "100%" }}>
        {/* Left: title + steps */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 32,
              opacity: headerIn,
              transform: `translateX(${(1 - headerIn) * -30}px)`,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 18,
                background: "linear-gradient(135deg, #fff, #ddd)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
              }}
            >
              🍎
            </div>
            <div>
              <div style={{ color: "hsl(220, 10%, 60%)", fontSize: 22, fontWeight: 500 }}>For iPhone</div>
              <div style={{ color: "white", fontFamily: fonts.display, fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
                Safari
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {STEPS.map((s, i) => (
              <StepCard key={i} step={i + 1} title={s.title} desc={s.desc} active={activeStep === i} done={activeStep > i} />
            ))}
          </div>
        </div>

        {/* Right: animated phone showing the steps */}
        <div>
          <PhoneFrame>
            <IOSPhoneScreen activeStep={activeStep} />
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const StepCard: React.FC<{ step: number; title: string; desc: string; active: boolean; done: boolean }> = ({
  step,
  title,
  desc,
  active,
  done,
}) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const accent = active ? "hsl(270, 100%, 70%)" : done ? "hsl(180, 80%, 55%)" : "hsl(220, 10%, 35%)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "20px 26px",
        borderRadius: 22,
        background: active ? "hsla(270, 100%, 65%, 0.12)" : "hsla(250, 15%, 12%, 0.6)",
        border: `2px solid ${active ? "hsla(270, 100%, 65%, 0.5)" : "hsla(250, 15%, 20%, 0.6)"}`,
        opacity: enter,
        transform: `translateX(${(1 - enter) * -40}px) scale(${active ? 1.02 : 1})`,
        transition: "all 0.3s",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.display,
          fontSize: 28,
          fontWeight: 700,
          color: "white",
          flexShrink: 0,
        }}
      >
        {done ? "✓" : step}
      </div>
      <div>
        <div style={{ color: "white", fontSize: 28, fontWeight: 600, marginBottom: 4, fontFamily: fonts.display }}>{title}</div>
        <div style={{ color: "hsl(220, 10%, 65%)", fontSize: 20 }}>{desc}</div>
      </div>
    </div>
  );
};

const IOSPhoneScreen: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: "100%", height: "100%", background: "white", position: "relative", overflow: "hidden" }}>
      {/* status bar */}
      <div style={{ height: 44, paddingTop: 18, display: "flex", justifyContent: "space-between", padding: "18px 28px 0", fontSize: 13, fontWeight: 600, color: "#000" }}>
        <span>9:41</span>
        <span>📶 100%</span>
      </div>

      {/* address bar */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ background: "#e5e5ea", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#000", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔒</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>renderme-ai.lovable.app</span>
        </div>
      </div>

      {/* page preview */}
      <div style={{ flex: 1, padding: 20, background: "linear-gradient(160deg, #08060f, #1a0a2e)", margin: "0 14px", borderRadius: 16, height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(180, 80%, 55%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
          }}
        >
          ✨
        </div>
        <div style={{ color: "white", fontSize: 22, fontWeight: 700, fontFamily: "inherit" }}>Renderme AI</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", padding: "0 20px" }}>AI photo editing</div>
      </div>

      {/* bottom toolbar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "rgba(245,245,250,0.95)", borderTop: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 24px" }}>
        <span style={{ fontSize: 20, color: "#999" }}>‹</span>
        <span style={{ fontSize: 20, color: "#999" }}>›</span>
        <ShareButton highlight={activeStep === 1} />
        <span style={{ fontSize: 20, color: "#999" }}>📑</span>
        <span style={{ fontSize: 20, color: "#999" }}>≡</span>
      </div>

      {/* Share sheet (steps 2-3) */}
      {activeStep >= 2 && <ShareSheet activeStep={activeStep} />}

      {/* Add dialog (step 3) */}
      {activeStep >= 3 && <AddDialog />}

      {/* Tap pulse */}
      {activeStep === 1 && <TapPulse x={170} y={695} />}
      {activeStep === 2 && <TapPulse x={300} y={510} />}
      {activeStep === 3 && <TapPulse x={310} y={170} />}
    </div>
  );
};

const ShareButton: React.FC<{ highlight: boolean }> = ({ highlight }) => {
  const frame = useCurrentFrame();
  const pulse = highlight ? 1 + Math.sin(frame / 4) * 0.1 : 1;
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: highlight ? "hsla(270, 100%, 65%, 0.25)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        color: "#007AFF",
        transform: `scale(${pulse})`,
        border: highlight ? "2px solid hsl(270, 100%, 65%)" : "none",
      }}
    >
      ⬆
    </div>
  );
};

const ShareSheet: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const enter = spring({ frame: frame - 60, fps, config: { damping: 22 } });
  const items = ["💬 Messages", "📧 Mail", "🔗 Copy Link", "🏠 Add to Home Screen", "📕 Add Bookmark"];
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(245,245,250,0.98)",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: "24px 0 32px",
        transform: `translateY(${(1 - enter) * 400}px)`,
        boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ width: 40, height: 5, borderRadius: 3, background: "#ccc", margin: "0 auto 20px" }} />
      <div style={{ padding: "0 20px" }}>
        {items.map((it, i) => {
          const highlight = activeStep === 2 && i === 3;
          return (
            <div
              key={it}
              style={{
                padding: "16px 14px",
                fontSize: 16,
                color: "#000",
                borderBottom: i < items.length - 1 ? "1px solid #e5e5ea" : "none",
                background: highlight ? "hsla(270, 100%, 65%, 0.18)" : "transparent",
                borderRadius: highlight ? 10 : 0,
                fontWeight: highlight ? 600 : 400,
              }}
            >
              {it}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AddDialog: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;
  const enter = spring({ frame: frame - 120, fps, config: { damping: 18 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 100,
        left: 24,
        right: 24,
        background: "white",
        borderRadius: 16,
        padding: 18,
        opacity: enter,
        transform: `scale(${0.9 + enter * 0.1})`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        border: "1px solid #ddd",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ color: "#007AFF", fontSize: 15 }}>Cancel</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#000" }}>Add to Home Screen</span>
        <span style={{ color: "white", background: "hsl(270, 100%, 65%)", padding: "4px 12px", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>Add</span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderTop: "1px solid #eee" }}>
        <div style={{ width: 50, height: 50, borderRadius: 12, background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(180, 80%, 55%))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✨</div>
        <div>
          <div style={{ fontWeight: 600, color: "#000", fontSize: 15 }}>Renderme AI</div>
          <div style={{ color: "#888", fontSize: 12 }}>renderme-ai.lovable.app</div>
        </div>
      </div>
    </div>
  );
};

export const TapPulse: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const frame = useCurrentFrame();
  const cycle = frame % 30;
  const scale = interpolate(cycle, [0, 30], [0.5, 2.5]);
  const opacity = interpolate(cycle, [0, 30], [0.8, 0]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 30,
          top: y - 30,
          width: 60,
          height: 60,
          borderRadius: 30,
          border: "3px solid hsl(270, 100%, 70%)",
          transform: `scale(${scale})`,
          opacity,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 14,
          top: y - 14,
          width: 28,
          height: 28,
          borderRadius: 14,
          background: "hsl(270, 100%, 70%)",
          boxShadow: "0 0 20px hsl(270, 100%, 70%)",
        }}
      />
    </>
  );
};
