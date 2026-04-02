import { useState, useRef, useCallback } from "react";
import { Repeat, Upload, Camera, ArrowLeft, Sparkles, Loader2, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ResultDisplay from "@/components/ResultDisplay";
import ProcessingSkeleton from "@/components/ProcessingSkeleton";
import { useEditHistory } from "@/hooks/useEditHistory";
import { saveToHistory } from "@/components/HistoryGallery";

type Step = "source" | "target" | "review";

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
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 bg-card">
        <img src={image} alt={label} className="w-full h-full object-cover" />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-7 h-7 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-white text-xs font-medium">{label}</p>
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
        className="w-full aspect-square rounded-2xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
      >
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">{step}</span>
        </div>
        <div className="text-center px-4">
          <p className="text-foreground font-semibold text-sm">{label}</p>
          <p className="text-muted-foreground text-xs mt-1">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}>
            <Camera className="w-3.5 h-3.5 mr-1" /> Camera
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Gallery
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
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const editHistory = useEditHistory();
  const currentEdit = editHistory.current;

  const currentStep: Step = !sourceImage ? "source" : !targetImage ? "target" : "review";

  const handleSwap = async () => {
    if (!sourceImage || !targetImage) return;
    setIsProcessing(true);
    abortRef.current = new AbortController();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageBase64: sourceImage,
            description: extraInstructions,
            mode: "faceswap",
            quality: "high",
            referenceImage: targetImage,
          }),
          signal: abortRef.current.signal,
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `Server error (${response.status})`);
      if (data?.error) throw new Error(data.error);

      if (data?.resultImage) {
        editHistory.push({ resultImage: data.resultImage, description: "Face swap", mode: "faceswap" });
        saveToHistory({ originalImage: sourceImage, resultImage: data.resultImage, description: "Face swap", mode: "faceswap" });
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
    setTargetImage(null);
    setExtraInstructions("");
  };

  const handleReEdit = () => {
    editHistory.reset();
    setExtraInstructions("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 sm:px-5 sm:pt-6 sm:pb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center bg-accent/20">
              <Repeat className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Face Swap</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Swap faces between two photos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-6 sm:px-5 sm:pb-8 flex flex-col gap-4 sm:gap-5">
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
            <div className="flex items-center justify-center gap-2 py-2">
              {["Your photo", "Face to use", "Swap!"].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i === 0 && currentStep === "source" ? "bg-primary text-primary-foreground" :
                    i === 1 && currentStep === "target" ? "bg-primary text-primary-foreground" :
                    i === 2 && currentStep === "review" ? "bg-primary text-primary-foreground" :
                    (i === 0 && sourceImage) || (i === 1 && targetImage) ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {(i === 0 && sourceImage) || (i === 1 && targetImage) ? "✓" : i + 1} {label}
                  </div>
                  {i < 2 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              ))}
            </div>

            {/* How it works (shown only on first step) */}
            {currentStep === "source" && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">How it works</h3>
                <div className="space-y-2.5">
                  {[
                    { num: "1", text: "Upload the photo you want to modify (body, pose, background)" },
                    { num: "2", text: "Upload the face you want to place on it" },
                    { num: "3", text: "Tap swap and let AI do the magic!" },
                  ].map((item) => (
                    <div key={item.num} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{item.num}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image upload grid */}
            <div className="grid grid-cols-2 gap-3">
              <ImageSlot
                image={sourceImage}
                onSelect={setSourceImage}
                onClear={() => setSourceImage(null)}
                label="Your photo"
                description="The body & pose to keep"
                step={1}
              />
              <ImageSlot
                image={targetImage}
                onSelect={setTargetImage}
                onClear={() => setTargetImage(null)}
                label="Face photo"
                description="The face to swap in"
                step={2}
              />
            </div>

            {/* Arrow showing direction */}
            {sourceImage && targetImage && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground animate-in fade-in duration-300">
                <span className="text-xs">Face from photo 2</span>
                <ArrowRight className="w-4 h-4" />
                <span className="text-xs">goes onto photo 1</span>
              </div>
            )}

            {/* Extra instructions */}
            {sourceImage && targetImage && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Extra instructions (optional)
                </label>
                <Textarea
                  placeholder="e.g. Match the skin tone perfectly, keep the lighting natural..."
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  className="bg-card border-border resize-none h-16 text-sm"
                />
              </div>
            )}

            {/* Quick tips */}
            {sourceImage && targetImage && (
              <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-300">
                {[
                  { label: "🎭 Natural blend", value: "Blend the face naturally, match skin tone and lighting perfectly" },
                  { label: "😄 Keep expression", value: "Keep the expression from the face photo" },
                  { label: "🎬 Cinematic", value: "Apply cinematic lighting and dramatic effect" },
                ].map((tip) => (
                  <button
                    key={tip.label}
                    onClick={() => setExtraInstructions(tip.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
              disabled={!sourceImage || !targetImage || isProcessing}
              className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Swap Faces
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default FaceSwap;
