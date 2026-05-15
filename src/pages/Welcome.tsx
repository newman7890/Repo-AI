import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Wand2,
  Repeat,
  Zap,
  Shield,
  Smartphone,
  ArrowRight,
  Check,
  PlayCircle,
  Lightbulb,
  Camera,
  Palette,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { InstallStepsCarousel } from "@/components/InstallStepsCarousel";
import { SEO } from "@/components/SEO";
import { FloatingDots } from "@/components/FloatingDots";
import ShowcaseSection from "@/components/ShowcaseSection";
import LazyVideo from "@/components/LazyVideo";

const features = [
  {
    icon: Wand2,
    title: "AI Photo Editing",
    desc: "Change backgrounds, outfits, scenery, and more with a single prompt.",
  },
  { icon: Repeat, title: "Multi-Face Swap", desc: "Swap up to 4 faces onto a single photo with cinematic realism." },
  { icon: Zap, title: "Hyper-Realistic", desc: "85mm lens quality, natural skin, no plastic CGI feel." },
  { icon: Shield, title: "Private & Secure", desc: "Your photos are processed securely and never shared." },
];

const Welcome = () => {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const ctaTarget = isAuthed ? "/app" : "/auth";
  const ctaLabel = isAuthed ? "Open app" : "Start editing";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden text-animated">
      <SEO
        title="Renderme AI — AI Photo Editor & Face Swap"
        description="Transform your photos with AI. Change backgrounds, swap faces, restore old pictures, and create hyper-realistic edits from your phone."
        canonical="/"
      />
      {/* Floating purple dots */}
      <FloatingDots count={200} />

      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl bg-accent" />
      </div>

      {/* Nav */}
      <header className="px-4 md:px-8 py-4 md:py-6 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/70">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Refresh page"
            title="Tap to refresh"
          >
            <div
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base md:text-lg tracking-tight">Renderme AI</span>
          </button>
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
                  <Button variant="ghost" size="sm" className="text-xs md:text-sm">
                    Sign in
                  </Button>
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

      <main>
        {/* Hero */}
        <section className="px-4 md:px-8 pt-16 md:pt-28 pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto text-center space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary-glow font-medium">AI powered photo magic</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.05] animate-text-float">
              Edit any photo
              <br />
              with{" "}
              <span
                className="bg-clip-text text-transparent animate-gradient-shift"
                style={{
                  backgroundImage: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))",
                  backgroundSize: "200% 200%",
                }}
              >
                just words.
              </span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Change backgrounds, swap faces, restyle outfits, and create cinematic portraits, all from a simple text
              prompt. No editing skills required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to={ctaTarget}>
                <Button
                  size="lg"
                  className="h-12 md:h-14 px-6 md:px-8 text-sm md:text-base bg-primary hover:bg-primary/90 rounded-2xl"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {ctaLabel}
                </Button>
              </Link>
              <a href="#install">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 md:h-14 px-6 md:px-8 text-sm md:text-base rounded-2xl"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Install on your phone
                </Button>
              </a>
            </div>
            <div className="mx-auto max-w-xl mt-2 inline-flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-left">
              <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <p className="text-xs md:text-sm text-foreground/90 leading-relaxed">
                <span className="font-semibold text-accent">Heads up:</span> Free tokens and trial edits are temporarily
                removed while we upgrade the system. They're expected back within the next 2 to 3 weeks. Paid tokens
                still work normally.
              </p>
            </div>
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
                <div
                  key={title}
                  className="bg-card/50 border border-border/60 rounded-2xl p-5 md:p-6 hover:border-primary/40 transition-colors"
                >
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

        {/* Tutorial video */}
        <section className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm mb-4">
                <PlayCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary-glow font-medium">Watch how it works</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">See it in action</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload a photo, type what you want, and let the AI do the rest in under 30 seconds.
              </p>
            </div>
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-border/60 bg-card/50 shadow-2xl">
              <LazyVideo
                src="/videos/tutorial.mp4"
                className="w-full h-auto block"
                poster="/placeholder.svg"
              />

            </div>
          </div>
        </section>

        {/* Real results: Before / After (admin-managed) */}
        <ShowcaseSection />

        {/* How to prompt the AI */}
        <section className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs md:text-sm mb-4">
                <Lightbulb className="w-3.5 h-3.5 text-accent" />
                <span className="text-accent font-medium">Prompt guide</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">How to prompt the AI</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                The better your prompt, the better your photo. Follow these simple rules for cinematic results every
                time.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-14">
              {[
                {
                  icon: Camera,
                  title: "Be specific about the scene",
                  desc: "Mention setting, lighting, and time of day.",
                  example: "“Standing on a Santorini rooftop at golden hour.”",
                },
                {
                  icon: Palette,
                  title: "Describe the style",
                  desc: "Add a look like cinematic, editorial, vintage, etc.",
                  example: "“Shot on 85mm film, soft natural light, shallow depth of field.”",
                },
                {
                  icon: Users,
                  title: "Keep the subject natural",
                  desc: "Say what to keep, like face, pose, outfit details.",
                  example: "“Keep my face and hair exactly the same.”",
                },
              ].map(({ icon: Icon, title, desc, example }) => (
                <div key={title} className="bg-card/50 border border-border/60 rounded-2xl p-5 md:p-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg mb-2">{title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-3">{desc}</p>
                  <p className="text-xs md:text-sm italic text-foreground/80 border-l-2 border-primary/40 pl-3">
                    {example}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-base md:text-lg">Good prompts</h3>
                </div>
                <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                  <li>• "Change my outfit to a black tuxedo, keep my face the same, studio lighting."</li>
                  <li>• "Place me in a snowy Tokyo street at night, cinematic 85mm shot."</li>
                  <li>• "Professional LinkedIn headshot, navy blazer, soft office background."</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-destructive/10 to-transparent border border-destructive/20 rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                  <h3 className="font-semibold text-base md:text-lg">Avoid these</h3>
                </div>
                <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                  <li>• Vague prompts: "make it better" or "cool photo"</li>
                  <li>• Too many ideas at once, stick to one transformation</li>
                  <li>• NSFW or adult content (not allowed)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section id="install" className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs md:text-sm mb-4">
                <Smartphone className="w-3.5 h-3.5 text-accent" />
                <span className="text-accent font-medium">Install as an app</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Get it on your home screen</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Renderme AI works like a native app, no app store needed. Watch the 30 second guide below.
              </p>
            </div>

            {/* Animated install carousel */}
            <InstallStepsCarousel />
          </div>
        </section>

        {/* Pricing/CTA */}
        <section className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple pricing</h2>
            <p className="text-base md:text-lg text-muted-foreground mb-10">
              Pay only for what you use. No subscriptions.
            </p>
            <div className="bg-card/50 border border-border/60 rounded-2xl md:rounded-3xl p-6 md:p-10 text-left space-y-4">
              {[
                { label: "Fast edit", cost: "1 token" },
                { label: "High quality", cost: "2 tokens" },
                { label: "Ultra realistic", cost: "3 tokens" },
                { label: "Face swap (multi-face)", cost: "5 tokens" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm md:text-base font-medium">{row.label}</span>
                  </div>
                  <span className="text-sm md:text-base text-muted-foreground font-mono">{row.cost}</span>
                </div>
              ))}
            </div>
            <Link to={ctaTarget} className="inline-block mt-10">
              <Button
                size="lg"
                className="h-12 md:h-14 px-8 text-sm md:text-base bg-primary hover:bg-primary/90 rounded-2xl"
              >
                {isAuthed ? "Open app" : "Get started"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-8 md:py-10 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wand2 className="w-3 h-3 text-white" />
            </div>
            <span>© {new Date().getFullYear()} Renderme AI. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <a href="mailto:renderme.site.ai@gmail.com" className="hover:text-foreground transition-colors">
              Contact support
            </a>
            {!isAuthed && (
              <Link to="/auth" className="hover:text-foreground transition-colors">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
