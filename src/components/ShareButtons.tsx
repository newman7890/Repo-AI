import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  resultImage: string;
}

const ShareButtons = ({ resultImage }: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleNativeShare = async () => {
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const file = new File([blob], "edited-photo.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My edited photo" });
      } else if (navigator.share) {
        await navigator.share({ title: "My edited photo", text: "Check out my AI-edited photo!" });
      } else {
        handleCopyImage();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        handleCopyImage();
      }
    }
  };

  const handleCopyImage = async () => {
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      toast({ title: "Copied!", description: "Image copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy as data URL
      try {
        await navigator.clipboard.writeText(resultImage);
        setCopied(true);
        toast({ title: "Copied!", description: "Image link copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({ title: "Can't copy", description: "Sharing not supported on this device.", variant: "destructive" });
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleNativeShare} variant="secondary" size="sm" className="gap-1.5">
        <Share2 className="w-4 h-4" /> Share
      </Button>
      <Button onClick={handleCopyImage} variant="outline" size="sm" className="gap-1.5">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
};

export default ShareButtons;
