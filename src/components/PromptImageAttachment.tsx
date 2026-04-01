import { useCallback, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptImageAttachmentProps {
  referenceImage: string | null;
  onImageSelect: (base64: string | null) => void;
  label?: string;
}

function compressImage(file: File, maxWidth = 512, quality = 0.7): Promise<string> {
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

const PromptImageAttachment = ({ referenceImage, onImageSelect, label = "Add reference image" }: PromptImageAttachmentProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      try {
        const compressed = await compressImage(file);
        onImageSelect(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = (e) => onImageSelect(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    },
    [onImageSelect]
  );

  if (referenceImage) {
    return (
      <div className="relative inline-flex items-center gap-2 p-2 bg-card rounded-xl border border-border">
        <img
          src={referenceImage}
          alt="Reference"
          className="w-16 h-16 rounded-lg object-cover"
        />
        <button
          onClick={() => onImageSelect(null)}
          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive/80 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="gap-1.5"
      >
        <ImagePlus className="w-4 h-4" />
        {label}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </>
  );
};

export default PromptImageAttachment;
