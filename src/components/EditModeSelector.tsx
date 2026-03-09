import { ImageIcon, Shirt, Hand, Wand2 } from "lucide-react";

export type EditMode = "background" | "clothing" | "action" | "custom";

interface EditMode_Info {
  id: EditMode;
  label: string;
  icon: React.ReactNode;
  description: string;
  placeholder: string;
  presets: { label: string; value: string }[];
}

export const editModes: EditMode_Info[] = [
  {
    id: "background",
    label: "Background",
    icon: <ImageIcon className="w-4 h-4" />,
    description: "Change the scene behind you",
    placeholder: "e.g. A cozy coffee shop with warm lighting...",
    presets: [
      { label: "🏖️ Beach", value: "a beautiful tropical beach with turquoise water and palm trees" },
      { label: "🌆 City", value: "a modern city skyline at sunset with golden hour lighting" },
      { label: "🚀 Space", value: "outer space with stars, nebula and Earth in the background" },
      { label: "🌲 Forest", value: "a lush green enchanted forest with sunlight filtering through trees" },
      { label: "🏔️ Mountains", value: "snowy mountain peaks with a dramatic blue sky" },
      { label: "🌸 Garden", value: "a beautiful Japanese cherry blossom garden in spring" },
    ],
  },
  {
    id: "clothing",
    label: "Outfit",
    icon: <Shirt className="w-4 h-4" />,
    description: "Change what the person is wearing",
    placeholder: "e.g. A sharp black tuxedo with a bow tie...",
    presets: [
      { label: "👔 Suit", value: "a stylish tailored navy blue business suit with a white shirt and silk tie" },
      { label: "👗 Dress", value: "an elegant red evening gown with flowing fabric" },
      { label: "🦸 Superhero", value: "a superhero costume like Spider-Man with full suit and mask details" },
      { label: "👘 Traditional", value: "a beautiful traditional Japanese kimono with floral patterns" },
      { label: "🏀 Sports", value: "a professional basketball jersey and shorts, athletic wear" },
      { label: "🧥 Winter", value: "a cozy oversized winter puffer jacket with a scarf and beanie" },
    ],
  },
  {
    id: "action",
    label: "Action",
    icon: <Hand className="w-4 h-4" />,
    description: "Change what the person is doing",
    placeholder: "e.g. Holding a cup of coffee and smiling...",
    presets: [
      { label: "☕ Coffee", value: "holding a steaming cup of coffee with both hands, looking cozy" },
      { label: "🍕 Eating", value: "eating a delicious slice of pizza, enjoying the food" },
      { label: "📱 Phone", value: "holding a smartphone, looking at the screen and smiling" },
      { label: "🎸 Guitar", value: "playing an acoustic guitar, fingers on the strings" },
      { label: "📚 Reading", value: "reading an open book, focused and engaged" },
      { label: "🏆 Trophy", value: "proudly holding up a golden trophy with a big smile" },
    ],
  },
  {
    id: "custom",
    label: "Magic",
    icon: <Wand2 className="w-4 h-4" />,
    description: "Describe any transformation",
    placeholder: "Describe exactly what you want to change about this photo...",
    presets: [
      { label: "😎 Sunglasses", value: "add stylish aviator sunglasses to the person" },
      { label: "🎩 Top hat", value: "add a classic black top hat on the person's head" },
      { label: "🌧️ Rain", value: "make it look like it's raining with dramatic lighting" },
      { label: "🎨 Oil painting", value: "transform the entire photo into an oil painting art style" },
      { label: "👴 Age", value: "make the person look 30 years older with realistic aging" },
      { label: "🧟 Zombie", value: "transform the person into a realistic zombie with makeup effects" },
    ],
  },
];

interface EditModeSelectorProps {
  activeMode: EditMode;
  onModeChange: (mode: EditMode) => void;
}

const EditModeSelector = ({ activeMode, onModeChange }: EditModeSelectorProps) => {
  return (
    <div className="flex gap-1.5 p-1 bg-card rounded-2xl border border-border">
      {editModes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
            activeMode === mode.id
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default EditModeSelector;
