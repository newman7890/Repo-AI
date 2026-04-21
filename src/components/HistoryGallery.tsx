import { useState, useEffect } from "react";
import { History, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HistoryItem {
  id: string;
  originalImage: string;
  resultImage: string;
  description: string;
  mode: string;
  createdAt: number;
}

interface DbRow {
  id: string;
  original_image: string;
  result_image: string;
  description: string;
  mode: string;
  created_at: string;
}

/**
 * Save an edit to the user's cloud-synced history (unlimited).
 * Falls back silently if the user is logged out or the request fails.
 */
export const saveToHistory = async (item: Omit<HistoryItem, "id" | "createdAt">) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("edit_history").insert({
      user_id: user.id,
      original_image: item.originalImage,
      result_image: item.resultImage,
      description: item.description,
      mode: item.mode,
    });
  } catch (err) {
    console.error("saveToHistory failed:", err);
  }
};

interface HistoryGalleryProps {
  onSelect: (item: HistoryItem) => void;
}

const HistoryGallery = ({ onSelect }: HistoryGalleryProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        return;
      }
      const { data, error } = await supabase
        .from("edit_history")
        .select("id, original_image, result_image, description, mode, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(
        (data || []).map((r: DbRow) => ({
          id: r.id,
          originalImage: r.original_image,
          resultImage: r.result_image,
          description: r.description,
          mode: r.mode,
          createdAt: new Date(r.created_at).getTime(),
        }))
      );
    } catch (err) {
      console.error("loadHistory failed:", err);
      toast({ title: "Couldn't load history", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  const clearHistory = async () => {
    if (!confirm("Clear all edit history? This cannot be undone.")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("edit_history").delete().eq("user_id", user.id);
    if (error) {
      toast({ title: "Failed to clear", description: error.message, variant: "destructive" });
      return;
    }
    setItems([]);
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = items;
    setItems((curr) => curr.filter((i) => i.id !== id));
    const { error } = await supabase.from("edit_history").delete().eq("id", id);
    if (error) {
      setItems(prev);
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Edit history">
        <History className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-base font-bold">Edit History</h2>
          <p className="text-[10px] text-muted-foreground">Synced to your account · {items.length} saved</p>
        </div>
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
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading your history…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <History className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs">No edits yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => { onSelect(item); setOpen(false); }}
                  className="w-full rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <div className="aspect-square">
                    <img src={item.resultImage} alt={item.description} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => deleteItem(item.id, e)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  title="Delete"
                  aria-label="Delete edit"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryGallery;
