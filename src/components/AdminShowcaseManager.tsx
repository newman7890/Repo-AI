import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Plus, Eye, EyeOff, Loader2, ImageIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ShowcaseRow {
  id: string;
  before_image: string;
  after_image: string;
  before_alt: string;
  after_alt: string;
  prompt: string;
  generation_seconds: number;
  sort_order: number;
  published: boolean;
  created_at: string;
}

interface EventStats {
  example_id: string | null;
  event_type: string;
  count: number;
}

const BUCKET = "showcase";

const AdminShowcaseManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ShowcaseRow[]>([]);
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ShowcaseRow | null>(null);

  // New example form
  const [newPrompt, setNewPrompt] = useState("");
  const [newSeconds, setNewSeconds] = useState("12");
  const [newBeforeAlt, setNewBeforeAlt] = useState("");
  const [newAfterAlt, setNewAfterAlt] = useState("");
  const [newBeforeFile, setNewBeforeFile] = useState<File | null>(null);
  const [newAfterFile, setNewAfterFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchAll = async () => {
    const [{ data: rowData }, { data: eventData }] = await Promise.all([
      supabase
        .from("showcase_examples")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("slider_events")
        .select("example_id, event_type"),
    ]);
    setRows((rowData as ShowcaseRow[]) || []);

    // Aggregate event counts client-side
    const agg: Record<string, Record<string, number>> = {};
    (eventData as EventStats[] | null)?.forEach((row) => {
      if (!row.example_id) return;
      agg[row.example_id] = agg[row.example_id] || {};
      agg[row.example_id][row.event_type] = (agg[row.example_id][row.event_type] || 0) + 1;
    });
    setStats(agg);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const uploadImage = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!newBeforeFile || !newAfterFile || !newPrompt.trim()) {
      toast({ title: "Missing fields", description: "Upload both photos and add a prompt.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const [beforeUrl, afterUrl] = await Promise.all([
        uploadImage(newBeforeFile, "before"),
        uploadImage(newAfterFile, "after"),
      ]);
      const nextOrder = (rows[rows.length - 1]?.sort_order ?? 0) + 1;
      const { error } = await supabase.from("showcase_examples").insert({
        before_image: beforeUrl,
        after_image: afterUrl,
        before_alt: newBeforeAlt || "Original photo before AI edit",
        after_alt: newAfterAlt || `AI-edited photo: ${newPrompt.slice(0, 100)}`,
        prompt: newPrompt,
        generation_seconds: Number(newSeconds) || 12,
        sort_order: nextOrder,
        published: true,
      });
      if (error) throw error;
      toast({ title: "Example added ✨" });
      setNewPrompt("");
      setNewBeforeAlt("");
      setNewAfterAlt("");
      setNewBeforeFile(null);
      setNewAfterFile(null);
      setNewSeconds("12");
      fetchAll();
    } catch (err) {
      toast({
        title: "Failed to add",
        description: err instanceof Error ? err.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (row: ShowcaseRow, patch: Partial<ShowcaseRow>) => {
    setSavingId(row.id);
    const { error } = await supabase.from("showcase_examples").update(patch).eq("id", row.id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    }
    setSavingId(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("showcase_examples").delete().eq("id", confirmDelete.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Example removed" });
      setRows((prev) => prev.filter((r) => r.id !== confirmDelete.id));
    }
    setConfirmDelete(null);
  };

  const replaceImage = async (row: ShowcaseRow, file: File, side: "before" | "after") => {
    setSavingId(row.id);
    try {
      const url = await uploadImage(file, side);
      const patch = side === "before" ? { before_image: url } : { after_image: url };
      const { error } = await supabase.from("showcase_examples").update(patch).eq("id", row.id);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
      toast({ title: `${side === "before" ? "Before" : "After"} image replaced` });
    } catch (err) {
      toast({
        title: "Replace failed",
        description: err instanceof Error ? err.message : "Upload failed",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading showcase examples…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Landing page showcase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border border-dashed border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add a new before/after example
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Before photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setNewBeforeFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
              {newBeforeFile && <p className="text-[10px] text-muted-foreground mt-1">{newBeforeFile.name}</p>}
            </div>
            <div>
              <Label className="text-xs">After photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setNewAfterFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
              {newAfterFile && <p className="text-[10px] text-muted-foreground mt-1">{newAfterFile.name}</p>}
            </div>
          </div>
          <div>
            <Label className="text-xs">Prompt used</Label>
            <Textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="e.g. Place me on a Santorini rooftop at golden hour, keep my face exactly the same."
              className="text-sm min-h-16"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Generation time (sec)</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={newSeconds}
                onChange={(e) => setNewSeconds(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Before alt text (SEO)</Label>
                <Input
                  value={newBeforeAlt}
                  onChange={(e) => setNewBeforeAlt(e.target.value)}
                  placeholder="Original outdoor portrait…"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">After alt text (SEO)</Label>
                <Input
                  value={newAfterAlt}
                  onChange={(e) => setNewAfterAlt(e.target.value)}
                  placeholder="AI-edited portrait with…"
                  className="text-xs"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} size="sm" className="w-full">
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {creating ? "Uploading…" : "Add example"}
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No examples yet. Add one above.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const s = stats[row.id] || {};
              return (
                <div key={row.id} className="border border-border rounded-xl p-3 space-y-3">
                  <div className="grid sm:grid-cols-[auto_1fr_auto] gap-3 items-start">
                    <div className="flex gap-2">
                      <ImageThumb url={row.before_image} label="Before" onReplace={(f) => replaceImage(row, f, "before")} />
                      <ImageThumb url={row.after_image} label="After" onReplace={(f) => replaceImage(row, f, "after")} />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Textarea
                        defaultValue={row.prompt}
                        onBlur={(e) => e.target.value !== row.prompt && handleUpdate(row, { prompt: e.target.value })}
                        className="text-xs min-h-14"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          defaultValue={row.before_alt}
                          onBlur={(e) => e.target.value !== row.before_alt && handleUpdate(row, { before_alt: e.target.value })}
                          placeholder="Before alt"
                          className="text-xs h-8"
                        />
                        <Input
                          defaultValue={row.after_alt}
                          onBlur={(e) => e.target.value !== row.after_alt && handleUpdate(row, { after_alt: e.target.value })}
                          placeholder="After alt"
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Time (sec)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            defaultValue={row.generation_seconds}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v && v !== row.generation_seconds) handleUpdate(row, { generation_seconds: v });
                            }}
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Sort order</Label>
                          <Input
                            type="number"
                            defaultValue={row.sort_order}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v) && v !== row.sort_order) handleUpdate(row, { sort_order: v });
                            }}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex items-center gap-2">
                        {row.published ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        <Switch
                          checked={row.published}
                          onCheckedChange={(v) => handleUpdate(row, { published: v })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDelete(row)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {savingId === row.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    <span>👁 <strong className="text-foreground">{s.view || 0}</strong> views</span>
                    <span>✋ <strong className="text-foreground">{s.drag_start || 0}</strong> drags</span>
                    <span>✓ <strong className="text-foreground">{s.drag_complete || 0}</strong> completes</span>
                    <span className="ml-auto text-[10px]">
                      {s.view ? `${Math.round(((s.drag_start || 0) / s.view) * 100)}% engagement` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this example?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove it from the landing page immediately. The image files in storage will remain (you can clean them up manually if needed).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

const ImageThumb = ({ url, label, onReplace }: { url: string; label: string; onReplace: (f: File) => void }) => (
  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group shrink-0">
    <img src={url} alt={label} className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <label className="cursor-pointer text-white text-[10px] font-semibold flex flex-col items-center gap-0.5">
        <Upload className="w-3.5 h-3.5" />
        Replace
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onReplace(f);
          }}
        />
      </label>
    </div>
    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] text-center py-0.5 font-bold uppercase">{label}</span>
  </div>
);

export default AdminShowcaseManager;
