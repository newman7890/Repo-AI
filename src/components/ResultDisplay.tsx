import { Download, RotateCcw, Undo2, Redo2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import ShareButtons from "@/components/ShareButtons";

interface ResultDisplayProps {
  originalImage: string;
  resultImage: string;
  onReset: () => void;
  onReEdit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  editCount: number;
  editIndex: number;
}

const ResultDisplay = ({
  originalImage,
  resultImage,
  onReset,
  onReEdit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  editCount,
  editIndex,
}: ResultDisplayProps) => {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `background-changed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-5 w-full">
        <BeforeAfterSlider beforeImage={originalImage} afterImage={resultImage} />

        {/* Undo / Redo bar */}
        {editCount > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onUndo} disabled={!canUndo} variant="ghost" size="icon" className="h-9 w-9">
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <span className="text-xs text-muted-foreground tabular-nums">
              {editIndex + 1} / {editCount}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onRedo} disabled={!canRedo} variant="ghost" size="icon" className="h-9 w-9">
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="flex items-center justify-between">
          <ShareButtons resultImage={resultImage} />
        </div>

        <div className="flex gap-3">
          <Button onClick={handleDownload} className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90">
            <Download className="w-5 h-5 mr-2" /> Download
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onReEdit} variant="secondary" className="h-12 px-4">
                <Pencil className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit again</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onReset} variant="outline" className="h-12 px-4">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start over</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ResultDisplay;
