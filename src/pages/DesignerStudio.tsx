import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Wand2, Palette, Download, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth-headers";
import { useUserCredits } from "@/hooks/useUserCredits";
import PaywallModal from "@/components/PaywallModal";
import PromptImageAttachment from "@/components/PromptImageAttachment";
import UserMenu from "@/components/UserMenu";
import CreditsBadge from "@/components/CreditsBadge";
import { SEO } from "@/components/SEO";
import ProcessingSkeleton from "@/components/ProcessingSkeleton";

type Category =
  | "flyer" | "poster" | "instagram_post" | "instagram_story"
  | "facebook_cover" | "twitter_post" | "linkedin_banner"
  | "youtube_thumbnail" | "google_ad" | "business_card" | "logo";

const CATEGORIES: { id: Category; label: string; emoji: string; group: string }[] = [
  { id: "flyer", label: "Flyer", emoji: "📄", group: "Print" },
  { id: "poster", label: "Poster", emoji: "🖼️", group: "Print" },
  { id: "business_card", label: "Business Card", emoji: "💼", group: "Print" },
  { id: "logo", label: "Logo", emoji: "✨", group: "Brand" },
  { id: "instagram_post", label: "IG Post", emoji: "📸", group: "Social" },
  { id: "instagram_story", label: "IG Story", emoji: "📱", group: "Social" },
  { id: "facebook_cover", label: "FB Cover", emoji: "📘", group: "Social" },
  { id: "twitter_post", label: "X Post", emoji: "𝕏", group: "Social" },
  { id: "linkedin_banner", label: "LinkedIn Banner", emoji: "💼", group: "Social" },
  { id: "youtube_thumbnail", label: "YT Thumbnail", emoji: "▶️", group: "Ads" },
  { id: "google_ad", label: "Google Ad", emoji: "🎯", group: "Ads" },
];

interface Fields {
  title: string;
  subtitle: string;
  bodyText: string;
  callToAction: string;
  date: string;
  location: string;
  contact: string;
  brandName: string;
}

const EMPTY_FIELDS: Fields = {
  title: "", subtitle: "", bodyText: "", callToAction: "",
  date: "", location: "", contact: "", brandName: "",
};

const STYLE_PRESETS = [
  "Bold modern minimalist with strong typography",
  "Vibrant gradient colors, energetic and youthful",
  "Luxury black & gold, premium elegant feel",
  "Retro 80s neon synthwave vibe",
  "Clean corporate, navy + white, professional",
  "Playful pastel, hand-drawn elements",
];

const DesignerStudio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { credits, loading: creditsLoading, refresh } = useUserCredits();

  const [category, setCategory] = useState<Category>("flyer");
  const [quality, setQuality] = useState<"high" | "ultra">("high");
  const [style, setStyle] = useState("");
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isPremium = !!credits?.is_premium;
  const tokenCost = quality === "ultra" ? 4 : 3;
  const hasAccess =
    isPremium ||
    (credits?.trial_uses_remaining ?? 0) > 0 ||
    (credits?.tokens ?? 0) >= tokenCost;

  const updateField = (key: keyof Fields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const handleGenerate = async () => {
    if (!hasAccess) { setShowPaywall(true); return; }
    if (credits?.blocked) {
      toast({ title: "Account Blocked", variant: "destructive" });
      return;
    }
    if (!style.trim() && !fields.title.trim()) {
      toast({
        title: "Add some details",
        description: "Enter at least a title or a style description.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResultImage(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/designer-studio`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ category, quality, style, fields, referenceImage }),
          signal: abortRef.current.signal,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "premium_required") { setShowPaywall(true); return; }
        if (data?.error === "insufficient_credits") { setShowPaywall(true); return; }
        throw new Error(data?.error || `Server error (${res.status})`);
      }
      if (data?.resultImage) {
        setResultImage(data.resultImage);
        refresh();
        toast({ title: "Design ready ✨" });
      } else {
        throw new Error("No image returned");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        toast({ title: "Cancelled" });
      } else {
        toast({
          title: "Generation failed",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `renderme-${category}-${Date.now()}.png`;
    a.click();
  };

  const groups = Array.from(new Set(CATEGORIES.map((c) => c.group)));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Designer Studio — AI Flyers, Banners & Logos"
        description="Generate professional flyers, social banners, business cards and logos in seconds with AI. Premium graphic design tool for creators."
        canonical="/designer"
        noindex
      />
      <header className="px-3 pt-3 pb-2 md:px-6 md:pt-5 md:pb-4 border-b border-border/40">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to editor"
              onClick={() => navigate("/app")}
              className="h-8 w-8 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div
              className="w-7 h-7 md:w-9 md:h-9 rounded-md md:rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Palette className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs md:text-base font-bold tracking-tight truncate">Designer Studio</h1>
              <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">For graphic designers · Premium</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <CreditsBadge credits={credits} loading={creditsLoading} onClick={() => !isPremium && setShowPaywall(true)} />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 md:px-6 max-w-6xl mx-auto w-full flex flex-col gap-4 md:gap-6 pt-4">
        {!hasAccess && !creditsLoading && (
          <Alert className="border-primary/40 bg-primary/5">
            <Lock className="h-4 w-4" />
            <AlertTitle className="text-sm">Need tokens to generate</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <span>Designer Studio uses {tokenCost} tokens per design. Top up or go Premium for unlimited.</span>
              <Button size="sm" onClick={() => setShowPaywall(true)} className="shrink-0">
                Get tokens
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {credits?.blocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Blocked</AlertTitle>
            <AlertDescription>Contact support at renderme.site.ai@gmail.com</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
          {/* LEFT — controls */}
          <div className="flex flex-col gap-4">
            {/* Category */}
            <div>
              <Label className="text-xs md:text-sm font-semibold mb-2 block">Design type</Label>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">{g}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {CATEGORIES.filter((c) => c.group === g).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setCategory(c.id)}
                          className={`px-2 py-2 rounded-lg border text-[11px] font-medium transition-all flex flex-col items-center gap-0.5 ${
                            category === c.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <span className="text-base leading-none">{c.emoji}</span>
                          <span className="leading-tight">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div>
              <Label className="text-xs md:text-sm font-semibold mb-1.5 block">Quality</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["high", "ultra"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      quality === q
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {q === "high" ? "High · 3 tokens" : "Ultra · 4 tokens"}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-semibold block">Content</Label>
              <Input placeholder="Headline / Title *" value={fields.title} onChange={(e) => updateField("title", e.target.value)} className="h-9 text-sm" maxLength={300} />
              <Input placeholder="Subtitle" value={fields.subtitle} onChange={(e) => updateField("subtitle", e.target.value)} className="h-9 text-sm" maxLength={300} />
              <Textarea placeholder="Body text / description" value={fields.bodyText} onChange={(e) => updateField("bodyText", e.target.value)} className="text-sm resize-none h-16" maxLength={300} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Date / Time" value={fields.date} onChange={(e) => updateField("date", e.target.value)} className="h-9 text-sm" maxLength={300} />
                <Input placeholder="Location" value={fields.location} onChange={(e) => updateField("location", e.target.value)} className="h-9 text-sm" maxLength={300} />
              </div>
              <Input placeholder='Call to action (e.g. "Buy Now")' value={fields.callToAction} onChange={(e) => updateField("callToAction", e.target.value)} className="h-9 text-sm" maxLength={300} />
              <Input placeholder="Contact (phone, website)" value={fields.contact} onChange={(e) => updateField("contact", e.target.value)} className="h-9 text-sm" maxLength={300} />
              <Input placeholder="Brand / Logo name" value={fields.brandName} onChange={(e) => updateField("brandName", e.target.value)} className="h-9 text-sm" maxLength={300} />
            </div>

            {/* Style */}
            <div>
              <Label className="text-xs md:text-sm font-semibold mb-1.5 block">Style direction</Label>
              <Textarea
                placeholder="Describe the look & feel: colors, mood, typography…"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="text-sm resize-none h-20"
                maxLength={1000}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {STYLE_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setStyle(p)}
                    className="text-[10px] px-2 py-1 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 transition"
                  >
                    {p.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>

            <PromptImageAttachment
              referenceImage={referenceImage}
              onImageSelect={setReferenceImage}
              label="Add brand/inspiration image"
            />

            <Button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full h-12 md:h-14 text-sm md:text-base font-bold rounded-2xl"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Designing…
                </>
              ) : !hasAccess ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Get tokens to generate
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Design ({tokenCost} tokens)
                </>
              )}
            </Button>
          </div>

          {/* RIGHT — preview */}
          <div className="lg:sticky lg:top-6">
            <div className="rounded-2xl border border-border bg-card overflow-hidden min-h-[300px] flex items-center justify-center">
              {isProcessing ? (
                <div className="w-full p-4">
                  <ProcessingSkeleton onCancel={() => abortRef.current?.abort()} />
                </div>
              ) : resultImage ? (
                <img src={resultImage} alt="AI generated design preview" className="w-full h-auto" />
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Wand2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Your design will appear here</p>
                </div>
              )}
            </div>
            {resultImage && !isProcessing && (
              <div className="flex gap-2 mt-3">
                <Button onClick={handleDownload} className="flex-1 gap-2">
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button variant="outline" onClick={() => setResultImage(null)} className="flex-1">
                  New design
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
};

export default DesignerStudio;
