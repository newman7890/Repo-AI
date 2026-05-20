import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Download, Film, Music, GripVertical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { renderImagesToVideo, type Aspect, type Slide } from "@/lib/video-renderer";

interface ImgItem {
  id: string;
  src: string;
  caption: string;
}

const MAX_IMAGES = 60;

const VideoStudio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<ImgItem[]>([]);
  const [title, setTitle] = useState("");
  const [aspect, setAspect] = useState<Aspect>("vertical");
  const [perSlide, setPerSlide] = useState(3);
  const [transition, setTransition] = useState(0.8);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicName, setMusicName] = useState<string>("");
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("mp4");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => () => {
    items.forEach((i) => URL.revokeObjectURL(i.src));
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - items.length;
    const arr = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      toast({ title: "Too many images", description: `Max ${MAX_IMAGES}. Added first ${remaining}.` });
    }
    const next: ImgItem[] = arr
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ id: crypto.randomUUID(), src: URL.createObjectURL(f), caption: "" }));
    setItems((p) => [...p, ...next]);
  };

  const removeItem = (id: string) => {
    setItems((p) => {
      const found = p.find((i) => i.id === id);
      if (found) URL.revokeObjectURL(found.src);
      return p.filter((i) => i.id !== id);
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, caption } : i)));
  };

  const moveItem = (from: number, to: number) => {
    setItems((p) => {
      const next = [...p];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  const onMusicPick = (f: File | undefined) => {
    if (!f) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setMusicUrl(URL.createObjectURL(f));
    setMusicName(f.name);
  };

  const handleGenerate = async () => {
    if (items.length < 2) {
      toast({ title: "Add more images", description: "Upload at least 2 images.", variant: "destructive" });
      return;
    }
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setIsRendering(true);
    setProgress(0);
    try {
      const slides: Slide[] = items.map((i) => ({ src: i.src, caption: i.caption }));
      const { blob, ext } = await renderImagesToVideo({
        slides,
        aspect,
        perSlide,
        transition,
        musicUrl,
        title: title.trim() || undefined,
        onProgress: (p) => setProgress(p),
      });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultExt(ext);
      toast({ title: "Video ready ✨", description: "Tap download to save it." });
    } catch (e) {
      console.error(e);
      toast({
        title: "Render failed",
        description: e instanceof Error ? e.message : "Could not render video.",
        variant: "destructive",
      });
    } finally {
      setIsRendering(false);
    }
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `renderme-video-${Date.now()}.${resultExt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Image to Video Studio | Renderme AI"
        description="Turn up to 60 photos into a cinematic video with smooth motion, music, captions and instant export."
        canonical="/video-studio"
        noindex
      />
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-3 py-2.5 md:px-6 md:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} aria-label="Back" className="h-9 w-9 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Film className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-sm md:text-lg font-bold truncate">Video Studio</h1>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{items.length}/{MAX_IMAGES}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-4 md:px-6 md:py-6 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 lg:gap-6">
        {/* Left: images */}
        <section className="flex flex-col gap-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-border rounded-2xl p-5 md:p-8 text-center cursor-pointer hover:bg-muted/40 transition"
          >
            <Upload className="w-7 h-7 mx-auto mb-2 text-primary" />
            <p className="text-sm font-semibold">Tap or drop photos (up to {MAX_IMAGES})</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  draggable
                  onDragStart={() => (dragId.current = it.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const from = items.findIndex((i) => i.id === dragId.current);
                    if (from >= 0 && from !== idx) moveItem(from, idx);
                    dragId.current = null;
                  }}
                  className="relative group rounded-xl overflow-hidden border border-border bg-card"
                >
                  <img src={it.src} alt={`Slide ${idx + 1}`} className="w-full aspect-square object-cover" />
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold rounded px-1.5 py-0.5">
                    {idx + 1}
                  </div>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-destructive text-white rounded-full p-1"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded p-1 opacity-60">
                    <GripVertical className="w-3 h-3" />
                  </div>
                  <Input
                    placeholder="Caption (optional)"
                    value={it.caption}
                    onChange={(e) => updateCaption(it.id, e.target.value)}
                    className="text-[11px] h-7 rounded-none border-0 border-t bg-card/80"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: settings */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 self-start bg-card/40 rounded-2xl p-4 border border-border/60">
          <div>
            <Label className="text-xs font-semibold">Title (optional)</Label>
            <Input
              placeholder="My amazing trip"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-9 text-sm"
              maxLength={60}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Format</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["vertical", "square", "horizontal"] as Aspect[]).map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={aspect === a ? "default" : "outline"}
                  onClick={() => setAspect(a)}
                  className="h-9 text-xs capitalize"
                >
                  {a === "vertical" ? "9:16" : a === "horizontal" ? "16:9" : "1:1"}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {aspect === "vertical" ? "TikTok / Reels" : aspect === "horizontal" ? "YouTube / Ads" : "Instagram"}
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold flex justify-between">
              <span>Seconds per photo</span><span className="text-primary">{perSlide.toFixed(1)}s</span>
            </Label>
            <input
              type="range"
              min={1.5}
              max={6}
              step={0.5}
              value={perSlide}
              onChange={(e) => setPerSlide(parseFloat(e.target.value))}
              className="w-full mt-1 accent-primary"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold flex justify-between">
              <span>Transition</span><span className="text-primary">{transition.toFixed(1)}s</span>
            </Label>
            <input
              type="range"
              min={0.2}
              max={1.5}
              step={0.1}
              value={transition}
              onChange={(e) => setTransition(parseFloat(e.target.value))}
              className="w-full mt-1 accent-primary"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Background music (optional)</Label>
            <input
              ref={musicInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => onMusicPick(e.target.files?.[0])}
            />
            <Button variant="outline" size="sm" onClick={() => musicInputRef.current?.click()} className="w-full h-9 text-xs gap-2">
              <Music className="w-3.5 h-3.5" />
              {musicName ? musicName.slice(0, 24) : "Add a music file"}
            </Button>
            {musicName && (
              <button
                onClick={() => { if (musicUrl) URL.revokeObjectURL(musicUrl); setMusicUrl(null); setMusicName(""); }}
                className="text-[10px] text-muted-foreground mt-1 underline"
              >
                Remove music
              </button>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isRendering || items.length < 2}
            className="w-full h-12 text-sm font-bold rounded-xl"
          >
            {isRendering ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rendering {Math.round(progress * 100)}%</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate Video</>
            )}
          </Button>

          {resultUrl && (
            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <video src={resultUrl} controls className="w-full rounded-xl bg-black" />
              <Button onClick={download} variant="default" className="w-full h-10 gap-2">
                <Download className="w-4 h-4" />
                Download .{resultExt}
              </Button>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Video is rendered on your device. Keep the tab open while it processes.
          </p>
        </aside>
      </main>
    </div>
  );
};

export default VideoStudio;
