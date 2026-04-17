import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles, Wand2, Repeat, Zap, Shield, Smartphone, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const features = [
  { icon: Wand2, title: "AI Photo Editing", desc: "Change backgrounds, outfits, scenery, and more with a single prompt." },
  { icon: Repeat, title: "Multi-Face Swap", desc: "Swap up to 4 faces onto a single photo with cinematic realism." },
  { icon: Zap, title: "Hyper-Realistic", desc: "85mm lens quality, natural skin, no plastic CGI feel." },
  { icon: Shield, title: "Private & Secure", desc: "Your photos are processed securely and never shared." },
];

const Welcome = () => {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const ctaTarget = isAuthed ? "/app" : "/auth";
  const ctaLabel = isAuthed ? "Open app" : "Start editing free";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl bg-accent" />
      </div>

      {/* Nav */}
      <header className="px-4 md:px-8 py-4 md:py-6 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base md:text-lg tracking-tight">Renderme AI</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {isAuthed ? (
              <Link to="/app">
                <Button size="sm" className="text-xs md:text-sm bg-primary hover:bg-primary/90">
                  Open app
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-xs md:text-sm">Sign in</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="text-xs md:text-sm bg-primary hover:bg-primary/90">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-4 md:px-8 pt-16 md:pt-28 pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto text-center space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-medium">AI-powered photo magic</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Edit any photo
            <br />
            with <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>just words.</span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Change backgrounds, swap faces, restyle outfits, and create cinematic portraits — all from a simple text prompt. No editing skills required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to={ctaTarget}>
              <Button size="lg" className="h-12 md:h-14 px-6 md:px-8 text-sm md:text-base bg-primary hover:bg-primary/90 rounded-2xl">
                <Sparkles className="w-4 h-4 mr-2" />
                {ctaLabel}
              </Button>
            </Link>
            <a href="#install">
              <Button size="lg" variant="outline" className="h-12 md:h-14 px-6 md:px-8 text-sm md:text-base rounded-2xl">
                <Smartphone className="w-4 h-4 mr-2" />
                Install on your phone
              </Button>
            </a>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground pt-2">
            ✨ 3 free edits · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need</h2>
            <p className="text-base md:text-lg text-muted-foreground">A complete creative studio in your pocket.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card/50 border border-border/60 rounded-2xl p-5 md:p-6 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2">{title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install / video section */}
      <section id="install" className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs md:text-sm mb-4">
              <Smartphone className="w-3.5 h-3.5 text-accent" />
              <span className="text-accent font-medium">Install as an app</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Get it on your home screen</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Renderme AI works like a native app — no app store needed. Watch the 30-second guide below.
            </p>
          </div>

          {/* Video player */}
          <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-border/60 bg-card/50 shadow-2xl mb-10 md:mb-14">
            <video
              src="/install-tutorial.mp4"
              controls
              playsInline
              preload="metadata"
              className="w-full h-auto block"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Install steps */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-card/50 border border-border/60 rounded-2xl p-5 md:p-7">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">📱</div>
                <h3 className="font-semibold text-base md:text-lg">iPhone (Safari)</h3>
              </div>
              <ol className="space-y-2.5 text-sm md:text-base text-muted-foreground">
                {["Open this site in Safari", "Tap the Share button", "Choose 'Add to Home Screen'", "Tap 'Add' — you're done!"].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-card/50 border border-border/60 rounded-2xl p-5 md:p-7">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">🤖</div>
                <h3 className="font-semibold text-base md:text-lg">Android (Chrome)</h3>
              </div>
              <ol className="space-y-2.5 text-sm md:text-base text-muted-foreground">
                {["Open this site in Chrome", "Tap the ⋮ menu (top right)", "Choose 'Install app'", "Confirm — Renderme is installed!"].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 shrink-0 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing/CTA */}
      <section className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple pricing</h2>
          <p className="text-base md:text-lg text-muted-foreground mb-10">Pay only for what you use. No subscriptions.</p>
          <div className="bg-card/50 border border-border/60 rounded-2xl md:rounded-3xl p-6 md:p-10 text-left space-y-4">
            {[
              { label: "Fast edit", cost: "1 token" },
              { label: "High quality", cost: "2 tokens" },
              { label: "Ultra realistic", cost: "3 tokens" },
              { label: "Face swap (multi-face)", cost: "5 tokens" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="text-sm md:text-base font-medium">{row.label}</span>
                </div>
                <span className="text-sm md:text-base text-muted-foreground font-mono">{row.cost}</span>
              </div>
            ))}
          </div>
          <Link to={ctaTarget} className="inline-block mt-10">
            <Button size="lg" className="h-12 md:h-14 px-8 text-sm md:text-base bg-primary hover:bg-primary/90 rounded-2xl">
              {isAuthed ? "Open app" : "Get started — 3 free edits"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-8 md:py-10 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Wand2 className="w-3 h-3 text-white" />
            </div>
            <span>© {new Date().getFullYear()} Renderme AI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <a href="mailto:newm5811@gmail.com" className="hover:text-foreground transition-colors">Contact support</a>
            {!isAuthed && <Link to="/auth" className="hover:text-foreground transition-colors">Sign in</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
