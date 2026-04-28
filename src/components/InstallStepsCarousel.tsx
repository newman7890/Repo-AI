import { useEffect, useState } from "react";
import { Share, Plus, MoreVertical, Download, Smartphone, Chrome, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  platform: "iOS" | "Android";
  platformIcon: typeof Smartphone;
  title: string;
  desc: string;
  illustration: React.ReactNode;
};

const PhoneFrame = ({ children, accent }: { children: React.ReactNode; accent: string }) => (
  <div className="relative mx-auto" style={{ width: 220, height: 360 }}>
    {/* Phone body */}
    <div
      className="absolute inset-0 rounded-[2.2rem] border-[6px] border-foreground/80 bg-background shadow-2xl overflow-hidden"
      style={{ boxShadow: `0 25px 60px -20px ${accent}` }}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-foreground/80 rounded-b-2xl z-10" />
      {/* Screen content */}
      <div className="relative w-full h-full pt-6 px-3 pb-3 flex flex-col gap-2">
        {children}
      </div>
    </div>
  </div>
);

const BrowserBar = ({ icon: Icon, label }: { icon: typeof Share; label: string }) => (
  <div className="flex items-center justify-between bg-muted/60 rounded-lg px-2.5 py-1.5 text-[10px] text-muted-foreground">
    <span className="truncate">renderme.site</span>
    <Icon className="w-3.5 h-3.5 text-primary animate-pulse" />
  </div>
);

const SharePopover = () => (
  <div className="bg-card border border-border rounded-xl p-2.5 shadow-xl animate-scale-in">
    <div className="grid grid-cols-3 gap-2 mb-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="aspect-square rounded-lg bg-muted/50" />
      ))}
    </div>
    <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-2 py-1.5">
      <Plus className="w-3.5 h-3.5 text-primary" />
      <span className="text-[10px] font-medium text-primary">Add to Home Screen</span>
    </div>
  </div>
);

const InstalledHomeScreen = ({ accent }: { accent: string }) => (
  <div className="flex-1 grid grid-cols-3 gap-2 content-start pt-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="aspect-square rounded-xl bg-muted/40" />
    ))}
    <div
      className="aspect-square rounded-xl flex items-center justify-center animate-scale-in shadow-lg"
      style={{ background: "var(--gradient-primary)", boxShadow: `0 8px 20px -5px ${accent}` }}
    >
      <span className="text-white text-[8px] font-bold">RM</span>
    </div>
  </div>
);

const AndroidMenu = () => (
  <div className="absolute top-2 right-2 bg-card border border-border rounded-lg shadow-xl p-1 animate-scale-in z-20 w-32">
    {["New tab", "History", "Downloads", "Install app"].map((item, i) => (
      <div
        key={item}
        className={cn(
          "px-2 py-1.5 rounded text-[10px] flex items-center gap-2",
          i === 3 && "bg-accent/15 text-accent font-semibold",
        )}
      >
        {i === 3 && <Download className="w-3 h-3" />}
        {item}
      </div>
    ))}
  </div>
);

const InstallPrompt = () => (
  <div className="bg-card border border-border rounded-xl p-3 shadow-xl animate-scale-in">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
        <span className="text-white text-[8px] font-bold">RM</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold truncate">Install Renderme AI?</p>
        <p className="text-[8px] text-muted-foreground">renderme.site</p>
      </div>
    </div>
    <div className="flex gap-1.5">
      <div className="flex-1 text-center text-[9px] py-1 rounded bg-muted/60 text-muted-foreground">Cancel</div>
      <div className="flex-1 text-center text-[9px] py-1 rounded bg-accent text-accent-foreground font-semibold">Install</div>
    </div>
  </div>
);

const STEPS: Step[] = [
  {
    platform: "iOS",
    platformIcon: Smartphone,
    title: "Open in Safari",
    desc: "Visit renderme.site in the Safari browser on your iPhone.",
    illustration: (
      <PhoneFrame accent="hsl(var(--primary) / 0.4)">
        <BrowserBar icon={Share} label="renderme.site" />
        <div className="flex-1 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl mb-2 flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <span className="text-white text-xs font-bold">RM</span>
            </div>
            <p className="text-[10px] font-semibold">Renderme AI</p>
          </div>
        </div>
      </PhoneFrame>
    ),
  },
  {
    platform: "iOS",
    platformIcon: Smartphone,
    title: "Tap the Share button",
    desc: "Tap the Share icon in Safari's bottom toolbar.",
    illustration: (
      <PhoneFrame accent="hsl(var(--primary) / 0.4)">
        <BrowserBar icon={Share} label="renderme.site" />
        <div className="flex-1 rounded-lg bg-muted/30" />
        <div className="flex items-center justify-around bg-muted/60 rounded-lg py-2">
          <div className="w-4 h-4 rounded bg-muted-foreground/30" />
          <div className="relative">
            <Share className="w-5 h-5 text-primary" />
            <span className="absolute -inset-2 rounded-full border-2 border-primary animate-ping" />
          </div>
          <div className="w-4 h-4 rounded bg-muted-foreground/30" />
          <div className="w-4 h-4 rounded bg-muted-foreground/30" />
        </div>
      </PhoneFrame>
    ),
  },
  {
    platform: "iOS",
    platformIcon: Smartphone,
    title: "Add to Home Screen",
    desc: "Scroll the share menu and choose 'Add to Home Screen'.",
    illustration: (
      <PhoneFrame accent="hsl(var(--primary) / 0.4)">
        <BrowserBar icon={Share} label="renderme.site" />
        <div className="flex-1 flex items-end">
          <SharePopover />
        </div>
      </PhoneFrame>
    ),
  },
  {
    platform: "iOS",
    platformIcon: Smartphone,
    title: "You're done!",
    desc: "Renderme AI is now on your home screen. Open it like a native app.",
    illustration: (
      <PhoneFrame accent="hsl(var(--primary) / 0.5)">
        <InstalledHomeScreen accent="hsl(var(--primary) / 0.5)" />
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-primary font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Installed
        </div>
      </PhoneFrame>
    ),
  },
  {
    platform: "Android",
    platformIcon: Chrome,
    title: "Open in Chrome",
    desc: "Visit renderme.site in Chrome on your Android device.",
    illustration: (
      <PhoneFrame accent="hsl(var(--accent) / 0.4)">
        <BrowserBar icon={MoreVertical} label="renderme.site" />
        <div className="flex-1 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl mb-2 flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <span className="text-white text-xs font-bold">RM</span>
            </div>
            <p className="text-[10px] font-semibold">Renderme AI</p>
          </div>
        </div>
      </PhoneFrame>
    ),
  },
  {
    platform: "Android",
    platformIcon: Chrome,
    title: "Tap the ⋮ menu",
    desc: "Tap the three-dot menu in the top right corner.",
    illustration: (
      <PhoneFrame accent="hsl(var(--accent) / 0.4)">
        <div className="flex items-center justify-between bg-muted/60 rounded-lg px-2.5 py-1.5">
          <span className="text-[10px] text-muted-foreground truncate">renderme.site</span>
          <div className="relative">
            <MoreVertical className="w-3.5 h-3.5 text-accent" />
            <span className="absolute -inset-1.5 rounded-full border-2 border-accent animate-ping" />
          </div>
        </div>
        <AndroidMenu />
        <div className="flex-1 rounded-lg bg-muted/30 mt-2" />
      </PhoneFrame>
    ),
  },
  {
    platform: "Android",
    platformIcon: Chrome,
    title: "Choose 'Install app'",
    desc: "Confirm in the install prompt to add Renderme to your home screen.",
    illustration: (
      <PhoneFrame accent="hsl(var(--accent) / 0.4)">
        <BrowserBar icon={MoreVertical} label="renderme.site" />
        <div className="flex-1 flex items-center">
          <InstallPrompt />
        </div>
      </PhoneFrame>
    ),
  },
  {
    platform: "Android",
    platformIcon: Chrome,
    title: "Installed!",
    desc: "Renderme AI is now on your home screen. Open it like a native app.",
    illustration: (
      <PhoneFrame accent="hsl(var(--accent) / 0.5)">
        <InstalledHomeScreen accent="hsl(var(--accent) / 0.5)" />
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-accent font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Installed
        </div>
      </PhoneFrame>
    ),
  },
];

export const InstallStepsCarousel = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % STEPS.length), 3500);
    return () => clearInterval(id);
  }, [paused]);

  const step = STEPS[index];
  const PlatformIcon = step.platformIcon;
  const isIOS = step.platform === "iOS";
  const accentClass = isIOS ? "text-primary" : "text-accent";
  const accentBg = isIOS ? "bg-primary/10 border-primary/30" : "bg-accent/10 border-accent/30";

  return (
    <div
      className="bg-card/50 border border-border/60 rounded-2xl md:rounded-3xl p-5 md:p-8 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
        {/* Illustration */}
        <div className="flex justify-center items-center min-h-[380px]">
          <div key={index} className="animate-fade-in">
            {step.illustration}
          </div>
        </div>

        {/* Copy */}
        <div key={`copy-${index}`} className="space-y-4 animate-fade-in">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium", accentBg, accentClass)}>
            <PlatformIcon className="w-3.5 h-3.5" />
            <span>{step.platform}</span>
            <span>· Step {(index % 4) + 1} of 4</span>
          </div>
          <h3 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">{step.title}</h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{step.desc}</p>

          {/* Progress dots */}
          <div className="flex items-center pt-2">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-6 min-w-6 px-1.5 flex items-center justify-center group"
              >
                <span
                  className={cn(
                    "h-1.5 rounded-full transition-all block",
                    i === index
                      ? cn("w-8", isIOS ? "bg-primary" : "bg-accent")
                      : "w-1.5 bg-muted-foreground/30 group-hover:bg-muted-foreground/50",
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Auto-advancing. Hover to pause</p>
        </div>
      </div>
    </div>
  );
};
