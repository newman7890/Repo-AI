import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from "remotion";
import { fonts } from "../MainVideo";
import { PhoneFrame, TapPulse } from "./IntroScene";

const STEPS = [
  { title: "Open in Chrome", desc: "Visit renderme-ai.lovable.app" },
  { title: "Tap the ⋮ menu", desc: "Top right corner" },
  { title: "Choose 'Install app'", desc: "Or 'Add to Home Screen'" },
  { title: "Tap 'Install'", desc: "Renderme is on your phone!" },
];

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
  const accent = active ? "hsl(180, 80%, 55%)" : done ? "hsl(270, 100%, 70%)" : "hsl(220, 10%, 35%)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "20px 26px",
        borderRadius: 22,
        background: active ? "hsla(180, 80%, 55%, 0.12)" : "hsla(250, 15%, 12%, 0.6)",
        border: `2px solid ${active ? "hsla(180, 80%, 55%, 0.5)" : "hsla(250, 15%, 20%, 0.6)"}`,
        opacity: enter,
        transform: `translateX(${(1 - enter) * -40}px) scale(${active ? 1.02 : 1})`,
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

export const AndroidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerIn = spring({ frame, fps, config: { damping: 18 } });
  const activeStep = Math.min(3, Math.floor(frame / 60));

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 120, maxWidth: 1700, width: "100%" }}>
        {/* Phone (left this time for variety) */}
        <div>
          <PhoneFrame>
            <AndroidPhoneScreen activeStep={activeStep} />
          </PhoneFrame>
        </div>

        {/* Right: title + steps */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 32,
              opacity: headerIn,
              transform: `translateX(${(1 - headerIn) * 30}px)`,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 18,
                background: "linear-gradient(135deg, #34A853, #4CAF50)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ color: "hsl(220, 10%, 60%)", fontSize: 22, fontWeight: 500 }}>For Android</div>
              <div style={{ color: "white", fontFamily: fonts.display, fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
                Chrome
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {STEPS.map((s, i) => (
              <StepCard key={i} step={i + 1} title={s.title} desc={s.desc} active={activeStep === i} done={activeStep > i} />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const AndroidPhoneScreen: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: "100%", height: "100%", background: "white", position: "relative", overflow: "hidden" }}>
      {/* status bar */}
      <div style={{ height: 30, paddingTop: 14, display: "flex", justifyContent: "space-between", padding: "14px 24px 0", fontSize: 12, fontWeight: 600, color: "#000" }}>
        <span>9:41</span>
        <span>📶 100%</span>
      </div>

      {/* address bar with menu */}
      <div style={{ padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, background: "#f1f3f4", borderRadius: 24, padding: "10px 16px", fontSize: 13, color: "#000", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11 }}>🔒</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>renderme-ai.lovable.app</span>
        </div>
        <MenuButton highlight={activeStep === 1} />
      </div>

      {/* page preview */}
      <div style={{ padding: 20, background: "linear-gradient(160deg, #08060f, #1a0a2e)", margin: "0 12px", borderRadius: 16, height: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
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
        <div style={{ color: "white", fontSize: 22, fontWeight: 700 }}>Renderme AI</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>AI photo editing</div>
      </div>

      {/* Menu dropdown (steps 2-3) */}
      {activeStep >= 2 && <ChromeMenu activeStep={activeStep} />}

      {/* Install dialog (step 3) */}
      {activeStep >= 3 && <InstallDialog />}

      {/* Tap pulses */}
      {activeStep === 1 && <TapPulse x={350} y={92} />}
      {activeStep === 2 && <TapPulse x={295} y={245} />}
      {activeStep === 3 && <TapPulse x={310} y={500} />}
    </div>
  );
};

const MenuButton: React.FC<{ highlight: boolean }> = ({ highlight }) => {
  const frame = useCurrentFrame();
  const pulse = highlight ? 1 + Math.sin(frame / 4) * 0.15 : 1;
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        background: highlight ? "hsla(180, 80%, 55%, 0.25)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        color: "#000",
        fontWeight: 700,
        transform: `scale(${pulse})`,
        border: highlight ? "2px solid hsl(180, 80%, 55%)" : "none",
      }}
    >
      ⋮
    </div>
  );
};

const ChromeMenu: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const enter = spring({ frame: frame - 60, fps, config: { damping: 22 } });
  const items = [
    { icon: "🔄", label: "New tab" },
    { icon: "🔖", label: "Bookmarks" },
    { icon: "⏬", label: "Downloads" },
    { icon: "📲", label: "Install app" },
    { icon: "⚙️", label: "Settings" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        top: 110,
        right: 18,
        width: 240,
        background: "white",
        borderRadius: 12,
        boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        padding: 8,
        opacity: enter,
        transform: `scale(${0.7 + enter * 0.3})`,
        transformOrigin: "top right",
      }}
    >
      {items.map((it, i) => {
        const highlight = activeStep === 2 && i === 3;
        return (
          <div
            key={it.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              fontSize: 14,
              color: "#000",
              background: highlight ? "hsla(180, 80%, 55%, 0.18)" : "transparent",
              borderRadius: 8,
              fontWeight: highlight ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 18 }}>{it.icon}</span>
            <span>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const InstallDialog: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 30;
  const enter = spring({ frame: frame - 120, fps, config: { damping: 18 } });
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", opacity: enter * 0.7 }} />
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 16,
          right: 16,
          background: "white",
          borderRadius: 20,
          padding: 22,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 100}px)`,
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, hsl(270, 100%, 65%), hsl(180, 80%, 55%))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✨</div>
          <div>
            <div style={{ fontWeight: 700, color: "#000", fontSize: 17 }}>Install Renderme AI?</div>
            <div style={{ color: "#666", fontSize: 13 }}>renderme-ai.lovable.app</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <div style={{ padding: "10px 18px", color: "#666", fontWeight: 600, fontSize: 14 }}>Cancel</div>
          <div style={{ padding: "10px 22px", background: "hsl(180, 80%, 55%)", color: "white", borderRadius: 10, fontWeight: 700, fontSize: 14 }}>Install</div>
        </div>
      </div>
    </>
  );
};
