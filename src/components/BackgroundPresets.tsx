const presets = [
  { label: "🏖️ Beach", value: "a beautiful tropical beach with turquoise water and palm trees" },
  { label: "🌆 City", value: "a modern city skyline at sunset with golden hour lighting" },
  { label: "🚀 Space", value: "outer space with stars, nebula and Earth in the background" },
  { label: "🌲 Forest", value: "a lush green enchanted forest with sunlight filtering through trees" },
  { label: "🏔️ Mountains", value: "snowy mountain peaks with a dramatic blue sky" },
  { label: "🌸 Garden", value: "a beautiful Japanese cherry blossom garden in spring" },
];

interface BackgroundPresetsProps {
  onSelect: (value: string) => void;
  selected: string;
}

const BackgroundPresets = ({ onSelect, selected }: BackgroundPresetsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={preset.label}
          onClick={() => onSelect(preset.value)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            selected === preset.value
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export default BackgroundPresets;
