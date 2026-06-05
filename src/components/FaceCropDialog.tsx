import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Crop, Check } from "lucide-react";

interface FaceCropDialogProps {
  open: boolean;
  image: string | null;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

async function getCroppedImage(imageSrc: string, area: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

const FaceCropDialog = ({ open, image, onCancel, onConfirm }: FaceCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!image || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImage(image, croppedAreaPixels);
      onConfirm(cropped);
    } finally {
      setProcessing(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crop className="w-4 h-4" /> Crop the face
          </DialogTitle>
          <DialogDescription className="text-xs">
            Drag to position and pinch/scroll to zoom. Frame just the face for a sharper swap.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-[320px] bg-black">
          {image && (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="px-4 py-3 space-y-2">
          <label className="text-[11px] text-muted-foreground font-medium">Zoom</label>
          <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={(v) => setZoom(v[0])} />
        </div>

        <DialogFooter className="px-4 pb-4 gap-2 flex-row">
          <Button variant="outline" className="flex-1 h-10" onClick={handleCancel} disabled={processing}>
            Skip
          </Button>
          <Button className="flex-1 h-10" onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            <Check className="w-4 h-4 mr-1" /> Use this face
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FaceCropDialog;
