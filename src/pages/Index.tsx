import { useState, useRef } from "react";
import { Sparkles, Loader2, Wand2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import EditModeSelector, { editModes, type EditMode } from "@/components/EditModeSelector";
import QualitySelector, { type QualityMode } from "@/components/QualitySelector";
import QuickPresets from "@/components/QuickPresets";
import ResultDisplay from "@/components/ResultDisplay";
import ProcessingSkeleton from "@/components/ProcessingSkeleton";
import HistoryGallery, { saveToHistory, type HistoryItem } from "@/components/HistoryGallery";
import PromptImageAttachment from "@/components/PromptImageAttachment";

import { useEditHistory } from "@/hooks/useEditHistory";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("background");
  const [quality, setQuality] = useState<QualityMode>("high");
  const [description, setDescription] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const editHistory = useEditHistory();

  const currentMode = editModes.find((m) => m.id === editMode)!;
  const currentEdit = editHistory.current;

  const handleGenerate = async () => {
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64: image, description, mode: editMode, quality, referenceImage }),
          signal: abortControllerRef.current.signal,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Server error (${response.status})`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.resultImage) {
        editHistory.push({ resultImage: data.resultImage, description, mode: editMode });
        saveToHistory({ originalImage: image!, resultImage: data.resultImage, description, mode: editMode });
        toast({ title: "Done! ✨", description: "Your edited photo is ready." });
      } else {
        throw new Error("No image returned");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast({ title: "Cancelled", description: "Edit was cancelled." });
      } else {
        console.error("Generation error:", err);
        toast({
          title: "Something went wrong",
          description: err.message || "Failed to edit photo. Please try again.",
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
      {/* Header */}
      <header className="px-4 pt-4 pb-3 sm:px-5 sm:pt-6 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
              <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">PhotoMagic</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground">AI Photo Editor</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/face-swap")}
              className="gap-1 sm:gap-1.5 rounded-xl text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Face Swap</span>
              <span className="xs:hidden">Swap</span>
            </Button>
            <HistoryGallery onSelect={handleHistorySelect} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-6 sm:px-5 sm:pb-8 flex flex-col gap-4 sm:gap-5">
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
            <ImageUpload
              onImageSelect={(base64) => setImage(base64 || null)}
              currentImage={image}
            />

            {image && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Mode Selector */}
                <EditModeSelector activeMode={editMode} onModeChange={handleModeChange} />

                {/* Mode Description */}
                <p className="text-sm text-muted-foreground">{currentMode.description}</p>

                {/* Quality Selector */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Quality
                  </label>
                  <QualitySelector activeQuality={quality} onQualityChange={setQuality} />
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
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
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Or describe it yourself
                  </label>
                  <Textarea
                    placeholder={currentMode.placeholder}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-card border-border resize-none h-20 text-sm"
                  />
                  <div className="mt-2">
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
                  className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {quality === "ultra" ? "Creating ultra-realistic magic..." : "Creating magic..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Transform Photo
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
