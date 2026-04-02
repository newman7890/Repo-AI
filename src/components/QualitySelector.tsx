import { Zap, Sparkles, Crown } from "lucide-react";

export type QualityMode = "fast" | "high" | "ultra";

interface QualityOption {
  id: QualityMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const qualityOptions: QualityOption[] = [
  {
    id: "fast",
    label: "Fast",
    icon: <Zap className="w-4 h-4" />,
    description: "Quick results",
  },
  {
    id: "high",
    label: "High",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Better quality",
  },
  {
    id: "ultra",
    label: "Ultra",
    icon: <Crown className="w-4 h-4" />,
    description: "Best realism",
  },
];

interface QualitySelectorProps {
  activeQuality: QualityMode;
  onQualityChange: (quality: QualityMode) => void;
}

const QualitySelector = ({ activeQuality, onQualityChange }: QualitySelectorProps) => {
  return (
    <div className="flex gap-1.5">
      {qualityOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => onQualityChange(option.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all border ${
            activeQuality === option.id
              ? "bg-primary/10 border-primary text-primary"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
          }`}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QualitySelector;
