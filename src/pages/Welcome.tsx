import { Link } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
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
import { SEO } from "@/components/SEO";
import { FloatingDots } from "@/components/FloatingDots";
import { FloatingSwooshes } from "@/components/FloatingSwooshes";
import { HeroSwoosh } from "@/components/HeroSwoosh";

// Below-the-fold sections — split out of the initial Welcome bundle
const InstallStepsCarousel = lazy(() =>
  import("@/components/InstallStepsCarousel").then((m) => ({ default: m.InstallStepsCarousel }))
);
const ShowcaseSection = lazy(() => import("@/components/ShowcaseSection"));
const LazyVideo = lazy(() => import("@/components/LazyVideo"));

const features = [
  {
    icon: Wand2,
    title: "AI Photo Editing",
    desc: "Change backgrounds, outfits, scenery, and more with a single prompt.",
  },
  { icon: Repeat, title: "Multi-Face Swap", desc: "Swap up to 4 faces onto a single photo with cinematic realism." },
  {
    icon: Palette,
    title: "Designer Studio",
    desc: "Generate flyers, posters, logos, IG posts, and YouTube thumbnails from a prompt.",
  },
  { icon: Zap, title: "Hyper-Realistic", desc: "85mm lens quality, natural skin, no plastic CGI feel." },
  { icon: Shield, title: "Private & Secure", desc: "Your photos are processed securely and never shared." },
];

const designerCategories = [
  { emoji: "📄", label: "Flyers" },
  { emoji: "🖼️", label: "Posters" },
  { emoji: "✨", label: "Logos" },
  { emoji: "📸", label: "IG Posts" },
  { emoji: "📱", label: "IG Stories" },
  { emoji: "▶️", label: "YT Thumbnails" },
  { emoji: "💼", label: "Business Cards" },
  { emoji: "🎯", label: "Google Ads" },
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
    <div className="min-h-screen text-foreground overflow-x-hidden">
      <SEO
        title="Repo AI | AI Photo Editor, Face Swap & Graphic Design"
        description="AI photo editor, face swap, and graphic design studio. Edit photos, swap faces, and generate flyers, posters, logos, and thumbnails from a text prompt."
        canonical="/"
      />
      {/* Site-wide ambient swooshes */}
      <FloatingSwooshes count={6} />

      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl bg-accent" />
      </div>

      {/* Nav */}
      <header className="px-6 md:px-12 py-3.5 md:py-4 border-b border-white/10 backdrop-blur-2xl sticky top-0 z-50 bg-background/75 supports-[backdrop-filter]:bg-background/60 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Repo AI, refresh page"
            title="Tap to refresh"
          >
            <img src="/app-logo.png" alt="Repo AI logo" width={36} height={36} className="w-8 h-8 md:w-9 md:h-9 object-contain" />
            <span className="font-bold text-lg md:text-xl tracking-tight">Repo AI</span>
          </button>
          <div className="flex items-center gap-3 md:gap-4">
            {isAuthed ? (
              <Link to="/app">
                <Button size="sm" className="px-5 text-xs md:text-sm bg-primary hover:bg-primary/90 rounded-xl">
                  Open app
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-xs md:text-sm hover:bg-white/5 rounded-xl">
                    Sign in
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="px-5 text-xs md:text-sm bg-primary hover:bg-primary/90 rounded-xl">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="space-y-4 md:space-y-8">
        {/* Hero */}
        <section className="relative z-20 px-6 md:px-12 pt-20 md:pt-32 pb-20 md:pb-32 overflow-hidden">
          <HeroSwoosh />
          <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-6 md:gap-8">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.15] md:leading-[1.1] animate-text-float">
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
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Change backgrounds, swap faces, restyle outfits, and create cinematic portraits, all from a simple text
              prompt. No editing skills required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 w-full">
              <Link to={ctaTarget}>
                <Button
                  size="lg"
                  className="h-13 md:h-14 px-8 text-base md:text-lg bg-primary hover:bg-primary/90 rounded-2xl shadow-lg hover:shadow-primary/20 transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {ctaLabel}
                </Button>
              </Link>
              <a href="#install">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 md:h-14 px-8 text-base md:text-lg rounded-2xl border-border/80 hover:bg-white/5 transition-all"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  How to install on your phone
                </Button>
              </a>
            </div>
            <div className="max-w-xl mx-auto mt-4 inline-flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 md:p-5 text-left">
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
        <section className="px-6 md:px-12 py-20 md:py-32 border-t border-border/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need</h2>
              <p className="text-base md:text-xl text-muted-foreground">A complete creative studio in your pocket.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {features.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-card/40 border border-border/60 rounded-3xl p-6 md:p-8 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 shadow-sm"
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg md:text-xl mb-3">{title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Designer Studio */}
        <section className="px-6 md:px-12 py-20 md:py-32 border-t border-border/40">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs md:text-sm">
                  <Palette className="w-3.5 h-3.5 text-accent" />
                  <span className="text-accent font-medium">Designer Studio</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.15]">
                  Not just photos,
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                    }}
                  >
                    full graphic design.
                  </span>
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Generate flyers, posters, logos, social posts, YouTube thumbnails, business cards, and Google ads
                  from a single prompt. Add your brand name, headline, and CTA. The AI handles layout, typography,
                  and styling.
                </p>
                <div className="pt-2">
                  <Link to={isAuthed ? "/designer" : "/auth"}>
                    <Button
                      size="lg"
                      className="h-13 md:h-14 px-8 text-base bg-primary hover:bg-primary/90 rounded-2xl shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      <Palette className="w-5 h-5 mr-2" />
                      Open Designer Studio
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {designerCategories.map((c) => (
                  <div
                    key={c.label}
                    className="aspect-[4/3] bg-card/40 border border-border/60 rounded-2xl flex flex-col items-center justify-center gap-2 p-3 hover:border-accent/40 hover:bg-card/70 transition-all hover:-translate-y-0.5 shadow-sm"
                  >
                    <span className="text-3xl">{c.emoji}</span>
                    <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tutorial video */}
        <section className="px-6 md:px-12 py-20 md:py-32 border-t border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12 md:mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm">
                <PlayCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary-glow font-medium">Watch how it works</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">See it in action</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload a photo, type what you want, and let the AI do the rest in under 30 seconds.
              </p>
            </div>
            <div className="relative rounded-3xl overflow-hidden border border-border/60 bg-card/40 shadow-2xl min-h-[220px]">
              <Suspense fallback={<div className="w-full aspect-video bg-muted/30" />}>
                <LazyVideo
                  src="/videos/tutorial.mp4"
                  className="w-full h-auto block"
                  poster="/placeholder.svg"
                />
              </Suspense>
            </div>
          </div>
        </section>

        <Suspense fallback={<div className="min-h-[400px]" />}>
          <ShowcaseSection />
        </Suspense>

        {/* How to prompt the AI */}
        <section className="px-6 md:px-12 py-20 md:py-32 border-t border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 md:mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs md:text-sm">
                <Lightbulb className="w-3.5 h-3.5 text-accent" />
                <span className="text-accent font-medium">Prompt guide</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">How to prompt the AI</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                The better your prompt, the better your photo. Follow these simple rules for cinematic results every
                time.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
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
                <div key={title} className="bg-card/40 border border-border/60 rounded-3xl p-6 md:p-8 space-y-4 hover:border-accent/40 transition-colors shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg md:text-xl">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  <p className="text-xs md:text-sm italic text-foreground/80 border-l-2 border-primary/40 pl-3 pt-1">
                    {example}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/25 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg md:text-xl">Good prompts</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span>•</span><span>"Change my outfit to a black tuxedo, keep my face the same, studio lighting."</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>"Place me in a snowy Tokyo street at night, cinematic 85mm shot."</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>"Professional LinkedIn headshot, navy blazer, soft office background."</span></li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-destructive/10 to-transparent border border-destructive/25 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                  <h3 className="font-semibold text-lg md:text-xl">Avoid these</h3>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span>•</span><span>Vague prompts: "make it better" or "cool photo"</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>Too many ideas at once, stick to one transformation</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>NSFW or adult content (not allowed)</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Install Section */}
        <section id="install" className="px-6 md:px-12 py-20 md:py-32 border-t border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12 md:mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs md:text-sm">
                <Smartphone className="w-3.5 h-3.5 text-accent" />
                <span className="text-accent font-medium">Install as an app</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Get it on your home screen</h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Repo AI works like a native app, no app store needed. Watch the 30 second guide below.
              </p>
            </div>

            {/* Animated install carousel */}
            <Suspense fallback={<div className="min-h-[400px]" />}>
              <InstallStepsCarousel />
            </Suspense>
          </div>
        </section>

        {/* Pricing/CTA */}
        <section className="px-6 md:px-12 py-20 md:py-32 border-t border-border/40">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple pricing</h2>
              <p className="text-base md:text-lg text-foreground/80">
                Pay only for what you use. No subscriptions.
              </p>
            </div>
            <div className="bg-card/40 border border-border/60 rounded-3xl p-6 md:p-10 text-left space-y-5 shadow-sm">
              {[
                { label: "Fast edit", cost: "1 token" },
                { label: "High quality", cost: "2 tokens" },
                { label: "Ultra realistic", cost: "3 tokens" },
                { label: "Face swap (multi-face)", cost: "5 tokens" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm md:text-base font-medium">{row.label}</span>
                  </div>
                  <span className="text-sm md:text-base text-muted-foreground font-mono font-semibold">{row.cost}</span>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <Link to={ctaTarget}>
                <Button
                  size="lg"
                  className="h-13 md:h-14 px-10 text-base md:text-lg bg-primary hover:bg-primary/90 rounded-2xl shadow-lg hover:shadow-primary/20 transition-all"
                >
                  {isAuthed ? "Open app" : "Get started"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-12 md:py-16 border-t border-border/40 bg-background/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <img src="/app-logo.png" alt="Repo AI logo" width={28} height={28} className="w-7 h-7 object-contain" />
            <span>© {new Date().getFullYear()} Repo AI. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
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
