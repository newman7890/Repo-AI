import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import BackgroundPresets from "@/components/BackgroundPresets";
import ResultDisplay from "@/components/ResultDisplay";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [image, setImage] = useState<string | null>(null);
  const [backgroundDesc, setBackgroundDesc] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!image || !backgroundDesc.trim()) {
      toast({
        title: "Missing info",
        description: "Please upload a photo and describe the background you want.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResultImage(null);

    try {
      const { data, error } = await supabase.functions.invoke("change-background", {
        body: { imageBase64: image, backgroundDescription: backgroundDesc },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.resultImage) {
        setResultImage(data.resultImage);
        toast({ title: "Done! ✨", description: "Your new background is ready." });
      } else {
        throw new Error("No image returned");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      toast({
        title: "Something went wrong",
        description: err.message || "Failed to change background. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResultImage(null);
    setImage(null);
    setBackgroundDesc("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BG Swap</h1>
            <p className="text-xs text-muted-foreground">AI Background Changer</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 pb-8 flex flex-col gap-6">
        {resultImage && image ? (
          <ResultDisplay
            originalImage={image}
            resultImage={resultImage}
            onReset={handleReset}
          />
        ) : (
          <>
            <ImageUpload
              onImageSelect={(base64) => setImage(base64 || null)}
              currentImage={image}
            />

            {image && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Choose a background
                  </label>
                  <BackgroundPresets
                    onSelect={setBackgroundDesc}
                    selected={backgroundDesc}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Or describe your own
                  </label>
                  <Textarea
                    placeholder="e.g. A cozy coffee shop with warm lighting..."
                    value={backgroundDesc}
                    onChange={(e) => setBackgroundDesc(e.target.value)}
                    className="bg-card border-border resize-none h-20 text-sm"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isProcessing || !backgroundDesc.trim()}
                  className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating magic...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Change Background
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
