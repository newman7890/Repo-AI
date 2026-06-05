import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Upload, Sparkles, X, Download, Loader2, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-headers";
import { SEO } from "@/components/SEO";

function compressImage(file: File, maxWidth = 1280, quality = 0.85): Promise<string> {
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

interface SlotProps {
  image: string | null;
  onSelect: (b64: string) => void;
  onClear: () => void;
  label: string;
  description: string;
}

const Slot = ({ image, onSelect, onClear, label, description }: SlotProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const onPick = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) return;
    try { onSelect(await compressImage(f)); }
    catch { toast.error("Could not read image"); }
  }, [onSelect]);

  if (image) {
    return (
      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-primary/30 bg-card">
        <img src={image} alt={label} className="w-full h-full object-cover" />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5 hover:bg-background"
          aria-label="Remove"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-xs font-semibold text-white">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => fileRef.current?.click()}
      className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-card/60 hover:bg-card hover:border-primary/50 transition flex flex-col items-center justify-center gap-2 p-4 text-center"
    >
      <Upload className="w-8 h-8 text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
      />
    </button>
  );
};

const FaceTransplant = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!source || !target) {
      toast.error("Please upload both images");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const headers = await getAuthHeaders();
      const { data, error } = await supabase.functions.invoke("face-transplant", {
        body: { sourceImage: source, targetImage: target, notes },
        headers,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const img = (data as any)?.resultImage;
      if (!img) throw new Error("No image returned");
      setResult(img);
      toast.success("Face transplanted");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Transplant failed");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `face-transplant-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Face Transplant (Admin)" description="Admin-only AI face transplant tool." canonical="/admin/face-transplant" noindex />
      <header className="px-4 pt-4 pb-3 md:px-6 border-b border-border">
        <div className="max-w-5xl mx-auto w-full flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-primary" />
            <h1 className="text-lg md:text-xl font-bold font-display">Face Transplant</h1>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold">Admin</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-5">
        <Card className="p-4 bg-card/60 border-border">
          <p className="text-sm text-muted-foreground">
            Upload a <strong className="text-foreground">source face</strong> (donor) and a{" "}
            <strong className="text-foreground">target body</strong>. The AI detects the face in each image, cuts the
            donor face, and grafts it onto the target — matching scale, pose, lighting and skin tone automatically.
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Slot
            image={source}
            onSelect={setSource}
            onClear={() => setSource(null)}
            label="Source Face"
            description="Image containing the face to cut"
          />
          <Slot
            image={target}
            onSelect={setTarget}
            onClear={() => setTarget(null)}
            label="Target Body"
            description="Image whose face will be replaced"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Optional notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. keep beard, soften jaw blend, preserve glasses on target..."
            maxLength={500}
            rows={3}
          />
        </div>

        <Button onClick={run} disabled={loading || !source || !target} className="w-full" size="lg">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transplanting…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> Transplant Face</>
          )}
        </Button>

        {result && (
          <Card className="p-3 bg-card border-border space-y-3">
            <div className="rounded-lg overflow-hidden bg-black/40">
              <img src={result} alt="Result" className="w-full h-auto" />
            </div>
            <div className="flex gap-2">
              <Button onClick={download} variant="secondary" className="flex-1">
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
              <Button onClick={() => setResult(null)} variant="outline" className="flex-1">
                Clear
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default FaceTransplant;
