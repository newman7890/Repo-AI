import { useState, useRef, useCallback } from "react";
import { getAuthHeaders } from "@/lib/auth-headers";
import { toast } from "sonner";
import { Repeat, Upload, Camera, ArrowLeft, Sparkles, X, ArrowRight, Plus, Trash2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ResultDisplay from "@/components/ResultDisplay";
import ProcessingSkeleton from "@/components/ProcessingSkeleton";
import { useEditHistory } from "@/hooks/useEditHistory";
import { saveToHistory } from "@/components/HistoryGallery";
import CreditsBadge from "@/components/CreditsBadge";
import PaywallModal from "@/components/PaywallModal";
import { useUserCredits } from "@/hooks/useUserCredits";
import UserMenu from "@/components/UserMenu";
import { SEO } from "@/components/SEO";

type Step = "source" | "faces" | "review";

interface FaceSlot {
  id: string;
  image: string | null;
}

function compressImage(file: File, maxWidth = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ImageSlotProps {
  image: string | null;
  onSelect: (base64: string) => void;
  onClear: () => void;
  label: string;
  description: string;
  step: number;
}

const ImageSlot = ({ image, onSelect, onClear, label, description, step }: ImageSlotProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImage(file);
      onSelect(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => onSelect(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, [onSelect]);

  if (image) {
    return (
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-primary/30 bg-card">
        <img src={image} alt={label} className="w-full h-full object-cover" />
        <button
          onClick={onClear}
          className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-white text-[10px] font-medium">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => e.preventDefault()}
        className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors p-2"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-bold text-primary">{step}</span>
        </div>
        <div className="text-center px-1">
          <p className="text-foreground font-semibold text-xs">{label}</p>
          <p className="text-muted-foreground text-[10px] mt-0.5 leading-tight">{description}</p>
        </div>
        <div className="flex flex-col gap-1.5 w-full px-1">
          <Button variant="outline" size="sm" className="h-7 text-[10px] w-full" onClick={async (e) => {
            e.stopPropagation();
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true });
              stream.getTracks().forEach(t => t.stop());
              cameraRef.current?.click();
            } catch {
              toast.error("Camera access denied. Please allow camera permission in your browser settings.");
            }
          }}>
            <Camera className="w-3 h-3 mr-1" /> Camera
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[10px] w-full" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
            <Upload className="w-3 h-3 mr-1" /> Gallery
          </Button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </>
  );
};

const FaceSwap = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [faceSlots, setFaceSlots] = useState<FaceSlot[]>([
    { id: "face-1", image: null },
  ]);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const editHistory = useEditHistory();
  const { credits, loading: creditsLoading, refresh: refreshCredits } = useUserCredits();
  const currentEdit = editHistory.current;

  const filledFaces = faceSlots.filter((s) => s.image !== null);
  const allFacesFilled = faceSlots.every((s) => s.image !== null);
  const currentStep: Step = !sourceImage ? "source" : !allFacesFilled ? "faces" : "review";

  const addFaceSlot = () => {
    if (faceSlots.length >= 4) return;
    setFaceSlots((prev) => [...prev, { id: `face-${Date.now()}`, image: null }]);
  };

  const removeFaceSlot = (id: string) => {
    if (faceSlots.length <= 1) return;
    setFaceSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const updateFaceSlot = (id: string, image: string | null) => {
    setFaceSlots((prev) => prev.map((s) => (s.id === id ? { ...s, image } : s)));
  };

  const handleSwap = async () => {
    if (credits?.blocked) {
      toast({ title: "Account Blocked", description: "Your account has been blocked. Please contact support.", variant: "destructive" });
      return;
    }
    if (!sourceImage || filledFaces.length === 0) return;
    setIsProcessing(true);
    abortRef.current = new AbortController();

    const multiDesc = filledFaces.length > 1
      ? `Swap ${filledFaces.length} different faces onto the ${filledFaces.length} most prominent people in the main photo. Each reference face should be applied to a different person. ${extraInstructions}`
      : extraInstructions;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-photo`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            imageBase64: sourceImage,
            description: multiDesc,
            mode: "faceswap",
            quality: "high",
            referenceImage: filledFaces[0].image,
            ...(filledFaces.length > 1 && { additionalFaces: filledFaces.slice(1).map((f) => f.image) }),
          }),
          signal: abortRef.current.signal,
        }
      );

      const data = await response.json();
      if (!response.ok) {
        if (data?.error === "insufficient_credits") {
          setShowPaywall(true);
          return;
        }
        throw new Error(data?.error || `Server error (${response.status})`);
      }
      if (data?.error) throw new Error(data.error);

      if (data?.resultImage) {
        const desc = filledFaces.length > 1 ? `Multi-face swap (${filledFaces.length} faces)` : "Face swap";
        editHistory.push({ resultImage: data.resultImage, description: desc, mode: "faceswap" });
        saveToHistory({ originalImage: sourceImage, resultImage: data.resultImage, description: desc, mode: "faceswap" });
        refreshCredits();
        toast({ title: "Face swapped! 🎭", description: "Your face swap is ready." });
      } else {
        throw new Error("No image returned");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast({ title: "Cancelled", description: "Face swap was cancelled." });
      } else {
        console.error("Face swap error:", err);
        toast({ title: "Something went wrong", description: err.message || "Failed to swap faces.", variant: "destructive" });
      }
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  };

  const handleReset = () => {
    editHistory.reset();
    setSourceImage(null);
    setFaceSlots([{ id: "face-1", image: null }]);
    setExtraInstructions("");
  };

  const handleReEdit = () => {
    editHistory.reset();
    setExtraInstructions("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-border/40">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="shrink-0 h-8 w-8 md:h-9 md:w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center bg-accent/20">
                <Repeat className="w-4 h-4 md:w-5 md:h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold tracking-tight leading-tight">Face Swap</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">Swap faces between two photos</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <CreditsBadge credits={credits} loading={creditsLoading} onClick={() => !credits?.trial_uses_remaining && !credits?.tokens && setShowPaywall(true)} />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-6 md:px-6 md:pb-10 flex flex-col gap-3 md:gap-5 max-w-5xl mx-auto w-full">
        {credits?.blocked && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-500">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Blocked</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>Your account has been blocked and you cannot use Face Swap.</span>
              <a href="mailto:newm5811@gmail.com?subject=Account%20Blocked%20-%20Renderme%20AI" className="inline-flex items-center gap-1 text-destructive-foreground underline font-semibold text-xs hover:opacity-80">
                Contact Support →
              </a>
            </AlertDescription>
          </Alert>
        )}
        {isProcessing ? (
          <ProcessingSkeleton onCancel={() => abortRef.current?.abort()} />
        ) : currentEdit && sourceImage ? (
          <ResultDisplay
            originalImage={sourceImage}
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
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-1 py-1">
              {["Photo", "Faces", "Swap!"].map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                    i === 0 && currentStep === "source" ? "bg-primary text-primary-foreground" :
                    i === 1 && currentStep === "faces" ? "bg-primary text-primary-foreground" :
                    i === 2 && currentStep === "review" ? "bg-primary text-primary-foreground" :
                    (i === 0 && sourceImage) || (i === 1 && allFacesFilled) ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {(i === 0 && sourceImage) || (i === 1 && allFacesFilled) ? "✓" : i + 1} {label}
                  </div>
                  {i < 2 && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />}
                </div>
              ))}
            </div>

            {/* How it works */}
            {currentStep === "source" && (
              <div className="bg-card rounded-xl border border-border p-3">
                <h3 className="text-xs font-semibold text-foreground mb-2">How it works</h3>
                <div className="space-y-2">
                  {[
                    { num: "1", text: "Upload the photo you want to modify" },
                    { num: "2", text: "Upload one or more faces to swap in" },
                    { num: "3", text: "Tap swap and let AI do the magic!" },
                  ].map((item) => (
                    <div key={item.num} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{item.num}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source image */}
            <div>
              <label className="text-xs md:text-sm font-semibold text-foreground mb-1.5 block">Source Photo</label>
              <div className="max-w-[200px] md:max-w-[280px]">
                <ImageSlot
                  image={sourceImage}
                  onSelect={setSourceImage}
                  onClear={() => setSourceImage(null)}
                  label="Your photo"
                  description="Body & pose to keep"
                  step={1}
                />
              </div>
            </div>

            {/* Face slots */}
            {sourceImage && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs md:text-sm font-semibold text-foreground">
                    Faces to swap ({faceSlots.length})
                  </label>
                  {faceSlots.length < 4 && (
                    <button
                      onClick={addFaceSlot}
                      className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add face
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 md:max-w-3xl">
                  {faceSlots.map((slot, idx) => (
                    <div key={slot.id} className="relative">
                      <ImageSlot
                        image={slot.image}
                        onSelect={(img) => updateFaceSlot(slot.id, img)}
                        onClear={() => updateFaceSlot(slot.id, null)}
                        label={`Face ${idx + 1}`}
                        description="Face to swap in"
                        step={idx + 2}
                      />
                      {faceSlots.length > 1 && !slot.image && (
                        <button
                          onClick={() => removeFaceSlot(slot.id)}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center z-10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direction hint */}
            {sourceImage && filledFaces.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground animate-in fade-in duration-300">
                <span className="text-[10px]">{filledFaces.length} face{filledFaces.length > 1 ? "s" : ""}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="text-[10px]">onto your photo</span>
              </div>
            )}

            {/* Extra instructions */}
            {sourceImage && allFacesFilled && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Extra instructions (optional)
                </label>
                <Textarea
                  placeholder="e.g. Match the skin tone, keep lighting natural..."
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  className="bg-card border-border resize-none h-14 text-xs"
                />
              </div>
            )}

            {/* Quick tips */}
            {sourceImage && allFacesFilled && (
              <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-300">
                {[
                  { label: "🎭 Natural", value: "Blend the face naturally, match skin tone and lighting perfectly" },
                  { label: "😄 Expression", value: "Keep the expression from the face photo" },
                  { label: "🎬 Cinematic", value: "Apply cinematic lighting and dramatic effect" },
                ].map((tip) => (
                  <button
                    key={tip.label}
                    onClick={() => setExtraInstructions(tip.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      extraInstructions === tip.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {tip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Swap button */}
            <Button
              onClick={handleSwap}
              disabled={!sourceImage || filledFaces.length === 0 || isProcessing}
              className="w-full h-12 text-sm font-bold rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Swap {filledFaces.length > 1 ? `${filledFaces.length} Faces` : "Face"} (5 tokens)
            </Button>
          </>
        )}
      </main>
      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
};

export default FaceSwap;
