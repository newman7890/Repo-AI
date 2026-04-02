import { useState, useEffect } from "react";
import { History, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryItem {
  id: string;
  originalImage: string;
  resultImage: string;
  description: string;
  mode: string;
  createdAt: number;
}

const STORAGE_KEY = "photomagic-history";
const MAX_ITEMS = 15;

export const saveToHistory = (item: Omit<HistoryItem, "id" | "createdAt">) => {
  try {
    const existing: HistoryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const newItem: HistoryItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
    const updated = [newItem, ...existing].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full or unavailable
  }
};

interface HistoryGalleryProps {
  onSelect: (item: HistoryItem) => void;
}

const HistoryGallery = ({ onSelect }: HistoryGalleryProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (open) {
      try {
        setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
      } catch {
        setItems([]);
      }
    }
  }, [open]);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
        <History className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-base font-bold">Edit History</h2>
        <div className="flex gap-1.5">
          {items.length > 0 && (
            <Button onClick={clearHistory} variant="ghost" size="sm" className="text-destructive gap-1 h-8 text-xs">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
          <Button onClick={() => setOpen(false)} variant="ghost" size="icon" className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <History className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs">No edits yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item); setOpen(false); }}
                className="rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors text-left"
              >
                <div className="aspect-square">
                  <img src={item.resultImage} alt={item.description} className="w-full h-full object-cover" />
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryGallery;
