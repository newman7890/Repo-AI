interface QuickPresetsProps {
  presets: { label: string; value: string }[];
  onSelect: (value: string) => void;
  selected: string;
}

const QuickPresets = ({ presets, onSelect, selected }: QuickPresetsProps) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.label}
          onClick={() => onSelect(preset.value)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
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

export default QuickPresets;
