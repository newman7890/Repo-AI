import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Original</span>
          <div className="rounded-xl overflow-hidden border border-border aspect-[3/4]">
            <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Result</span>
          <div className="rounded-xl overflow-hidden border-2 border-primary/30 aspect-[3/4] shadow-lg">
            <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
          </div>
        </div>
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
