import { useCallback, useRef } from "react";
import { Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  currentImage: string | null;
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
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ImageUpload = ({ onImageSelect, currentImage }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      try {
        const compressed = await compressImage(file);
        onImageSelect(compressed);
      } catch {
        // fallback to raw
        const reader = new FileReader();
        reader.onload = (e) => onImageSelect(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (currentImage) {
    return (
      <div className="relative w-full aspect-[3/4] max-h-[50vh] rounded-2xl overflow-hidden border-2 border-border">
        <img src={currentImage} alt="Uploaded photo" className="w-full h-full object-cover" />
        <button
          onClick={() => onImageSelect("")}
          className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full aspect-[3/4] max-h-[50vh] rounded-2xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Upload className="w-8 h-8 text-primary" />
      </div>
      <div className="text-center px-6">
        <p className="text-foreground font-semibold text-lg">Upload your photo</p>
        <p className="text-muted-foreground text-sm mt-1">Tap to browse or drag & drop</p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
        >
          <Camera className="w-4 h-4 mr-1" /> Camera
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          <Upload className="w-4 h-4 mr-1" /> Gallery
        </Button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
};

export default ImageUpload;
