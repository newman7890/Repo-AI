import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import ShareButtons from "@/components/ShareButtons";

interface ResultDisplayProps {
  originalImage: string;
  resultImage: string;
  onReset: () => void;
}

const ResultDisplay = ({ originalImage, resultImage, onReset }: ResultDisplayProps) => {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `background-changed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <BeforeAfterSlider beforeImage={originalImage} afterImage={resultImage} />

      <div className="flex items-center justify-between">
        <ShareButtons resultImage={resultImage} />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleDownload} className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90">
          <Download className="w-5 h-5 mr-2" /> Download
        </Button>
        <Button onClick={onReset} variant="outline" className="h-12 px-4">
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ResultDisplay;
