import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Wand2, Repeat, Zap, Palette } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth-headers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import EditModeSelector, { editModes, type EditMode } from "@/components/EditModeSelector";
import QualitySelector, { type QualityMode } from "@/components/QualitySelector";
import QuickPresets from "@/components/QuickPresets";
import ResultDisplay from "@/components/ResultDisplay";
import ProcessingSkeleton from "@/components/ProcessingSkeleton";
import HistoryGallery, { saveToHistory, type HistoryItem } from "@/components/HistoryGallery";
import PromptImageAttachment from "@/components/PromptImageAttachment";
import CreditsBadge from "@/components/CreditsBadge";
import PaywallModal from "@/components/PaywallModal";
import { useUserCredits } from "@/hooks/useUserCredits";
import UserMenu from "@/components/UserMenu";
import { SEO } from "@/components/SEO";
import faceSwapIcon from "@/assets/face-swap-icon.png";

import { useEditHistory } from "@/hooks/useEditHistory";
import { useNavigate, useSearchParams } from "react-router-dom";

async function verifyCheckoutReturn(refreshCredits: () => Promise<void>, toast: ReturnType<typeof useToast>["toast"], reference: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
    {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ reference }),
    }
  );

  const data = await response.json();
  if (!response.ok || data?.payment_status !== "success") {
    throw new Error(data?.message || data?.error || "Payment verification failed");
  }

  await refreshCredits();
  toast({
    title: "🎉 Payment successful!",
    description: "Your premium tokens have been added. Enjoy editing!",
  });
}

const Index = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("background");
  const [quality, setQuality] = useState<QualityMode>("high");
  const [description, setDescription] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const editHistory = useEditHistory();
  const { credits, loading: creditsLoading, refresh: refreshCredits } = useUserCredits();

  // Handle payment success callback
  useEffect(() => {
    const payment = searchParams.get("payment");
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    if (payment === "success" && reference) {
      verifyCheckoutReturn(refreshCredits, toast, reference)
        .catch((error: Error) => {
          toast({
            title: "Payment verification pending",
            description: error.message,
            variant: "destructive",
          });
        })
        .finally(() => {
          searchParams.delete("payment");
          searchParams.delete("reference");
          searchParams.delete("trxref");
          setSearchParams(searchParams, { replace: true });
        });
    } else if (payment === "success") {
      refreshCredits();
      toast({
        title: "🎉 Payment successful!",
        description: "Your premium tokens have been added. Enjoy editing!",
      });
      searchParams.delete("payment");
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentMode = editModes.find((m) => m.id === editMode)!;
  const currentEdit = editHistory.current;

  const handleGenerate = async () => {
    if (credits?.blocked) {
      toast({ title: "Account Blocked", description: "Your account has been blocked. Please contact support for assistance.", variant: "destructive" });
      return;
    }
    if (!image) {
      toast({ title: "Missing photo", description: "Please upload a photo first.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Missing description", description: "Please describe the edit you want.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-photo`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ imageBase64: image, description, mode: editMode, quality, referenceImage }),
          signal: abortControllerRef.current.signal,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data?.error === "insufficient_credits") {
          setShowPaywall(true);
          return;
        }
        if (data?.error === "account_blocked" || data?.blocked) {
          toast({ title: "Account Blocked", description: "Your account has been blocked. Please contact support.", variant: "destructive" });
          return;
        }
        throw new Error(data?.error || `Server error (${response.status})`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.resultImage) {
        editHistory.push({ resultImage: data.resultImage, description, mode: editMode });
        saveToHistory({ originalImage: image!, resultImage: data.resultImage, description, mode: editMode });
        refreshCredits();
        toast({ title: "Done! ✨", description: "Your edited photo is ready." });
      } else {
        throw new Error("No image returned");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        toast({ title: "Cancelled", description: "Edit was cancelled." });
      } else {
        console.error("Generation error:", err);
        toast({
          title: "Something went wrong",
          description: err instanceof Error ? err.message : "Failed to edit photo. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleEnhancePrompt = async () => {
    if (credits?.blocked) {
      toast({ title: "Account Blocked", description: "Your account has been blocked.", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Nothing to enhance", description: "Type a prompt first, then enhance it.", variant: "destructive" });
      return;
    }
    setIsEnhancing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-prompt`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ description, mode: editMode }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (data?.error === "insufficient_credits") {
          setShowPaywall(true);
          return;
        }
        if (data?.error === "account_blocked" || data?.blocked) {
          toast({ title: "Account Blocked", description: "Your account has been blocked.", variant: "destructive" });
          return;
        }
        throw new Error(data?.error || `Server error (${response.status})`);
      }
      if (data?.enhancedPrompt) {
        setDescription(data.enhancedPrompt);
        refreshCredits();
        toast({ title: "Prompt enhanced ✨", description: "2 tokens used." });
      } else {
        throw new Error("No enhanced prompt returned");
      }
    } catch (err: unknown) {
      toast({
        title: "Enhancement failed",
        description: err instanceof Error ? err.message : "Could not enhance the prompt.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleReset = () => {
    editHistory.reset();
    setImage(null);
    setDescription("");
    setReferenceImage(null);
  };

  const handleReEdit = () => {
    editHistory.reset();
    setDescription("");
    setReferenceImage(null);
  };

  const handleModeChange = (mode: EditMode) => {
    setEditMode(mode);
    setDescription("");
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setImage(item.originalImage);
    editHistory.push({ resultImage: item.resultImage, description: item.description, mode: item.mode });
    setDescription(item.description);
    setEditMode(item.mode as EditMode);
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="AI Photo Editor Edit Your Photos"
        description="Edit photos with a single prompt. Change backgrounds, outfits, lighting and more with hyper-realistic AI."
        canonical="/app"
        noindex
      />
      <header className="px-3 pt-3 pb-2 md:px-6 md:pt-5 md:pb-4 border-b border-border/40">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-1.5 md:gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 md:gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Refresh app"
            title="Tap to refresh"
          >
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-md md:rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
              <Wand2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <h1 className="text-xs md:text-base font-bold tracking-tight truncate">Renderme AI — Edit your photos</h1>
          </button>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <CreditsBadge credits={credits} loading={creditsLoading} onClick={() => !credits?.trial_uses_remaining && !credits?.tokens && setShowPaywall(true)} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/face-swap")}
              className="rounded-lg h-8 md:h-9 gap-1.5 px-2 md:px-2.5 border-accent/40 hover:bg-accent/10"
              title="Face Swap"
            >
              <img src={faceSwapIcon} alt="" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6 object-contain" />
              <span className="hidden sm:inline text-xs font-semibold">Face Swap</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/designer")}
              className="rounded-lg h-8 md:h-9 gap-1.5 px-2 md:px-2.5 border-primary/40 hover:bg-primary/10"
              title="Designer Studio (Premium)"
            >
              <Palette className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              <span className="hidden sm:inline text-xs font-semibold">Designer</span>
            </Button>
            <HistoryGallery onSelect={handleHistorySelect} />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-6 md:px-6 md:pb-10 flex flex-col gap-4 md:gap-6 max-w-6xl mx-auto w-full">
        {/* Blocked User Banner */}
        {credits?.blocked && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Blocked</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>Your account has been blocked and you cannot edit photos.</span>
              <a href="mailto:renderme.site.ai@gmail.com?subject=Account%20Blocked%20Renderme%20AI" className="inline-flex items-center gap-1 text-destructive-foreground underline font-semibold text-xs hover:opacity-80">
                Contact Support →
              </a>
            </AlertDescription>
          </Alert>
        )}

        {isProcessing ? (
          <ProcessingSkeleton onCancel={handleCancel} />
        ) : currentEdit && image ? (
          <ResultDisplay
            originalImage={image}
            resultImage={currentEdit.resultImage}
            onReset={handleReset}
            onReEdit={handleReEdit}
            canUndo={editHistory.canUndo}
            canRedo={editHistory.canRedo}
            onUndo={editHistory.undo}
            onRedo={editHistory.redo}
            editCount={editHistory.count}
            editIndex={editHistory.currentIndex}
          />
        ) : (
          <>
            <div className={image ? "grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:gap-8 items-start" : "max-w-2xl mx-auto w-full"}>
              <div className="lg:sticky lg:top-6">
                <ImageUpload
                  onImageSelect={(base64) => setImage(base64 || null)}
                  currentImage={image}
                />
              </div>

              {image && (
                <div className="flex flex-col gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Mode Selector */}
                  <EditModeSelector activeMode={editMode} onModeChange={handleModeChange} />

                  {/* Mode Description */}
                  <p className="text-xs md:text-sm text-muted-foreground">{currentMode.description}</p>

                  {/* Quality Selector */}
                  <div>
                    <label className="text-xs md:text-sm font-semibold text-foreground mb-1.5 block">
                      Quality
                    </label>
                    <QualitySelector activeQuality={quality} onQualityChange={setQuality} />
                  </div>

                  {/* Quick Presets */}
                  <div>
                    <label className="text-xs md:text-sm font-semibold text-foreground mb-1.5 block">
                      Quick picks
                    </label>
                    <QuickPresets
                      presets={currentMode.presets}
                      onSelect={setDescription}
                      selected={description}
                    />
                  </div>

                  {/* Custom Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <label className="text-xs md:text-sm font-semibold text-foreground">
                        Or describe it yourself
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancing || isProcessing || !description.trim()}
                        className="h-7 px-2 text-[10px] md:text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                        title="Enhance prompt with AI (2 tokens)"
                      >
                        {isEnhancing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        {isEnhancing ? "Enhancing..." : "Enhance (2 tokens)"}
                      </Button>
                    </div>
                    <Textarea
                      placeholder={currentMode.placeholder}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-card border-border resize-none h-16 md:h-20 text-sm"
                    />
                    <div className="mt-1.5">
                      <PromptImageAttachment
                        referenceImage={referenceImage}
                        onImageSelect={setReferenceImage}
                        label="Add reference image"
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={isProcessing || !description.trim()}
                    className="w-full h-12 md:h-14 text-sm md:text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {quality === "ultra" ? "Creating ultra-realistic magic..." : "Creating magic..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Transform Photo ({quality === "fast" ? 1 : quality === "high" ? 2 : 3} {quality === "fast" ? "token" : "tokens"})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
};

export default Index;
