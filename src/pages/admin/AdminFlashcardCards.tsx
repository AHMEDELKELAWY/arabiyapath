import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus, Loader2, Upload, Images, Search, ListOrdered,
  CheckCircle2, EyeOff, Eye, ImageIcon, Volume2, Trash2, Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BulkImageUploadDialog } from "@/components/admin/flashcards/BulkImageUploadDialog";
import { CardRow } from "@/components/admin/flashcards/CardRow";

type ImportRow = {
  arabic_text: string;
  english_translation: string;
  transliteration?: string;
  example_arabic?: string;
  example_english?: string;
  image_url?: string;
  image_alt?: string;
  audio_url?: string;
  audio_example_url?: string;
  notes?: string;
  order_index?: number;
  published?: boolean | string;
};

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.length > 1 || cur[0] !== "") rows.push(cur);
        cur = [];
      } else field += ch;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const headers = rows.shift()!.map((h) => h.trim());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? "").trim()])));
}

type SortKey = "order" | "arabic" | "published" | "hasImage" | "hasAudio";

type CardKind = "speaking" | "learn";

export default function AdminFlashcardCards() {
  const [params, setParams] = useSearchParams();
  const unitId = params.get("unit") || "";
  const kindParam = (params.get("kind") as CardKind) || "speaking";
  const kind: CardKind = kindParam === "learn" ? "learn" : "speaking";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [jumpValue, setJumpValue] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const [form, setForm] = useState<any>({
    arabic_text: "", english_translation: "", transliteration: "",
    example_arabic: "", example_english: "", image_url: "", image_alt: "",
    audio_url: "", audio_example_url: "", notes: "", published: false, order_index: 0,
  });

  const setKind = (next: CardKind) => {
    const p = new URLSearchParams(params);
    p.set("kind", next);
    setParams(p, { replace: true });
    setSelected(new Set());
  };

  const { data: units } = useQuery({
    queryKey: ["admin-fc-units-min"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en")
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: cards } = useQuery({
    queryKey: ["admin-fc-cards", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards").select("*").eq("unit_id", unitId).order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const unitSlug = useMemo(
    () => (units ?? []).find((u: any) => u.id === unitId)?.slug || "",
    [units, unitId],
  );
  const hasSlug = !!unitSlug;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-fc-cards", unitId] });

  const stats = useMemo(() => {
    const list = cards ?? [];
    return {
      total: list.length,
      published: list.filter((c: any) => c.published).length,
      draft: list.filter((c: any) => !c.published).length,
      images: list.filter((c: any) => c.image_url).length,
      audio: list.filter((c: any) => c.audio_url).length,
    };
  }, [cards]);

  const duplicateOrders = useMemo(() => {
    const counts = new Map<number, number>();
    (cards ?? []).forEach((c: any) => counts.set(c.order_index, (counts.get(c.order_index) ?? 0) + 1));
    return new Set(Array.from(counts.entries()).filter(([, n]) => n > 1).map(([k]) => k));
  }, [cards]);

  const visibleCards = useMemo(() => {
    let list = [...(cards ?? [])];
    const q = search.trim().toLowerCase();
    if (q) {
      const asNum = Number(q);
      list = list.filter((c: any) =>
        (c.arabic_text || "").toLowerCase().includes(q) ||
        (c.english_translation || "").toLowerCase().includes(q) ||
        (Number.isFinite(asNum) && c.order_index === asNum)
      );
    }
    const cmp: Record<SortKey, (a: any, b: any) => number> = {
      order: (a, b) => a.order_index - b.order_index,
      arabic: (a, b) => (a.arabic_text || "").localeCompare(b.arabic_text || ""),
      published: (a, b) => Number(!!b.published) - Number(!!a.published),
      hasImage: (a, b) => Number(!!b.image_url) - Number(!!a.image_url),
      hasAudio: (a, b) => Number(!!b.audio_url) - Number(!!a.audio_url),
    };
    list.sort(cmp[sortKey]);
    return list;
  }, [cards, search, sortKey]);

  const startNew = () => {
    if (!unitId) return toast({ title: "Pick a unit first" });
    setEditing({});
    setForm({
      arabic_text: "", english_translation: "", transliteration: "",
      example_arabic: "", example_english: "", image_url: "", image_alt: "",
      audio_url: "", audio_example_url: "", notes: "", published: false,
      order_index: (cards?.length ?? 0) + 1,
    });
  };

  const startEdit = (c: any) => { setEditing(c); setForm({ ...c }); };

  const save = async () => {
    const payload = { ...form, unit_id: unitId };
    let error;
    if (editing?.id) {
      ({ error } = await (supabase as any).from("flashcards").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("flashcards").insert(payload));
    }
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    setEditing(null);
    invalidate();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this card?")) return;
    const { error } = await (supabase as any).from("flashcards").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    invalidate();
  };

  const genImage = async (c: any) => {
    setBusyId(c.id);
    try {
      const { error } = await supabase.functions.invoke("generate-flashcard-image", { body: { cardId: c.id } });
      if (error) throw error;
      toast({ title: "Image generated" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Image generation failed", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const genAudio = async (c: any, kind: "main" | "example" = "main") => {
    setBusyId(c.id);
    try {
      const { error } = await supabase.functions.invoke("generate-flashcard-audio", { body: { cardId: c.id, kind } });
      if (error) throw error;
      toast({ title: "Audio generated" });
      invalidate();
    } catch (e: any) {
      toast({ title: "Audio generation failed", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const handleImport = async (file: File) => {
    if (!unitId) return toast({ title: "Pick a unit first" });
    try {
      const text = await file.text();
      let rows: ImportRow[];
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : parsed?.cards ?? [];
      } else {
        rows = parseCSV(text) as unknown as ImportRow[];
      }
      if (!rows.length) return toast({ title: "Nothing to import" });
      const startOrder = (cards?.length ?? 0) + 1;
      const payload = rows
        .filter((r) => r.arabic_text && r.english_translation)
        .map((r, i) => ({
          unit_id: unitId,
          arabic_text: String(r.arabic_text),
          english_translation: String(r.english_translation),
          transliteration: r.transliteration ?? null,
          example_arabic: r.example_arabic ?? null,
          example_english: r.example_english ?? null,
          image_url: r.image_url ?? null,
          image_alt: r.image_alt ?? null,
          audio_url: r.audio_url ?? null,
          audio_example_url: r.audio_example_url ?? null,
          notes: r.notes ?? null,
          order_index: Number(r.order_index ?? startOrder + i),
          published: r.published === true || r.published === "true" || r.published === "1",
        }));
      if (!payload.length) return toast({ title: "No valid rows" });
      const { error } = await (supabase as any).from("flashcards").insert(payload);
      if (error) throw error;
      toast({ title: `Imported ${payload.length} cards` });
      invalidate();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  };

  // ---- Bulk actions ----
  const bulkSetPublished = async (published: boolean) => {
    if (!confirm(`${published ? "Publish" : "Unpublish"} all cards in this unit?`)) return;
    setBulkBusy("publish");
    const { error } = await (supabase as any).from("flashcards").update({ published }).eq("unit_id", unitId);
    setBulkBusy(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: published ? "All cards published" : "All cards unpublished" });
    invalidate();
  };

  const bulkClear = async (column: "image_url" | "audio_url") => {
    const label = column === "image_url" ? "images" : "audio";
    if (!confirm(`Remove ALL ${label} in this unit? This cannot be undone.`)) return;
    setBulkBusy(column);
    const { error } = await (supabase as any).from("flashcards").update({ [column]: null }).eq("unit_id", unitId);
    setBulkBusy(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `All ${label} removed` });
    invalidate();
  };

  const bulkGenerateMissing = async (kind: "image" | "audio") => {
    const list = (cards ?? []).filter((c: any) =>
      kind === "image" ? !c.image_url : !c.audio_url,
    );
    if (!list.length) return toast({ title: `No cards missing ${kind}` });
    if (!confirm(`Generate ${kind} for ${list.length} card${list.length === 1 ? "" : "s"}?`)) return;
    setBulkBusy(`gen-${kind}`);
    let ok = 0, fail = 0;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      try {
        const fn = kind === "image" ? "generate-flashcard-image" : "generate-flashcard-audio";
        const body = kind === "image" ? { cardId: c.id } : { cardId: c.id, kind: "main" };
        const { error } = await supabase.functions.invoke(fn, { body });
        if (error) throw error;
        ok++;
      } catch {
        fail++;
      }
      toast({ title: `Generating ${kind}…`, description: `${i + 1} / ${list.length}` });
    }
    setBulkBusy(null);
    toast({
      title: `Bulk ${kind} generation complete`,
      description: `Success: ${ok} · Failed: ${fail}`,
      variant: fail ? "destructive" : "default",
    });
    invalidate();
  };

  const renumberCards = async () => {
    if (!confirm("Recalculate card numbers? This will renumber every card 1..N in the current order.")) return;
    setBulkBusy("renumber");
    const ordered = [...(cards ?? [])].sort((a: any, b: any) => a.order_index - b.order_index);
    let fail = 0;
    for (let i = 0; i < ordered.length; i++) {
      const newOrder = i + 1;
      if (ordered[i].order_index === newOrder) continue;
      const { error } = await (supabase as any)
        .from("flashcards").update({ order_index: newOrder }).eq("id", ordered[i].id);
      if (error) fail++;
    }
    setBulkBusy(null);
    toast({
      title: "Renumbering complete",
      description: fail ? `${fail} card(s) failed to update` : "Cards renumbered 1..N",
      variant: fail ? "destructive" : "default",
    });
    invalidate();
  };

  const handleJump = () => {
    const n = Number(jumpValue);
    if (!Number.isFinite(n)) return;
    const target = (cards ?? []).find((c: any) => c.order_index === n);
    if (!target) {
      toast({ title: `No card #${n} in this unit` });
      return;
    }
    setSearch("");
    setTimeout(() => {
      const el = document.getElementById(`card-${target.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(target.id);
      setTimeout(() => setHighlightId(null), 3000);
    }, 50);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Flash Cards</h1>
          <select
            className="border rounded px-2 py-1 bg-background"
            value={unitId}
            onChange={(e) => { window.location.search = `?unit=${e.target.value}`; }}
          >
            <option value="">— select unit —</option>
            {units?.map((u: any) => <option key={u.id} value={u.id}>{u.title_en}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label>
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              disabled={!unitId}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.currentTarget.value = "";
              }}
            />
            <Button asChild variant="outline" disabled={!unitId}>
              <span className="cursor-pointer"><Upload className="w-4 h-4 mr-2" /> Import CSV/JSON</span>
            </Button>
          </label>
          <Button
            variant="outline"
            onClick={() => {
              if (!hasSlug) {
                toast({ title: "This unit has no slug — set one before uploading images.", variant: "destructive" });
                return;
              }
              setBulkOpen(true);
            }}
            disabled={!unitId || !hasSlug}
            title={!hasSlug ? "Unit has no slug" : undefined}
          >
            <Images className="w-4 h-4 mr-2" /> Bulk Image Upload
          </Button>
          <Button onClick={startNew} disabled={!unitId}><Plus className="w-4 h-4 mr-2" /> New Card</Button>
        </div>
      </div>

      {unitId && (
        <BulkImageUploadDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          unitId={unitId}
          unitSlug={unitSlug}
          cards={(cards ?? []).map((c: any) => ({
            id: c.id,
            order_index: c.order_index,
            arabic_text: c.arabic_text,
            english_translation: c.english_translation,
            image_url: c.image_url,
            image_key: c.image_key,
          }))}
          onComplete={invalidate}
        />
      )}

      {!unitId ? (
        <p className="text-muted-foreground">Pick a unit to manage its cards.</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Total", value: stats.total },
              { label: "Published", value: stats.published },
              { label: "Draft", value: stats.draft },
              { label: "Images", value: stats.images },
              { label: "Audio", value: stats.audio },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bulk actions */}
          <Card className="mb-4">
            <CardContent className="p-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkSetPublished(true)} disabled={!!bulkBusy}>
                <Eye className="w-3 h-3 mr-1" /> Publish All
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkSetPublished(false)} disabled={!!bulkBusy}>
                <EyeOff className="w-3 h-3 mr-1" /> Unpublish All
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkGenerateMissing("image")} disabled={!!bulkBusy}>
                {bulkBusy === "gen-image" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Generate Missing Images
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkGenerateMissing("audio")} disabled={!!bulkBusy}>
                {bulkBusy === "gen-audio" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Generate Missing Audio
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkClear("image_url")} disabled={!!bulkBusy}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove All Images
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkClear("audio_url")} disabled={!!bulkBusy}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove All Audio
              </Button>
              <Button size="sm" variant="outline" onClick={renumberCards} disabled={!!bulkBusy}>
                <ListOrdered className="w-3 h-3 mr-1" /> Recalculate Card Numbers
              </Button>
            </CardContent>
          </Card>

          {/* Search / sort / jump */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search Arabic, English, or card number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Jump to #"
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleJump(); }}
                className="w-28"
              />
              <Button size="sm" variant="outline" onClick={handleJump}>Go</Button>
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Card Number ↑</SelectItem>
                <SelectItem value="arabic">Arabic Text</SelectItem>
                <SelectItem value="published">Published Status</SelectItem>
                <SelectItem value="hasImage">Has Image</SelectItem>
                <SelectItem value="hasAudio">Has Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards */}
          <div className="grid gap-3">
            {visibleCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cards match.</p>
            ) : (
              visibleCards.map((c: any) => (
                <CardRow
                  key={c.id}
                  card={c}
                  unitFolder={unitSlug}
                  duplicate={duplicateOrders.has(c.order_index)}
                  highlighted={highlightId === c.id}
                  busy={busyId === c.id}
                  onBusyChange={setBusyId}
                  onMutated={invalidate}
                  onEdit={startEdit}
                  onDelete={del}
                  onGenImage={genImage}
                  onGenAudio={genAudio}
                />
              ))
            )}
          </div>
        </>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit Card #${editing.order_index}` : "New Card"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Arabic (with tashkeel)</Label>
              <Input value={form.arabic_text} dir="rtl" onChange={(e) => setForm({ ...form, arabic_text: e.target.value })} /></div>
            <div className="space-y-1"><Label>English translation</Label>
              <Input value={form.english_translation} onChange={(e) => setForm({ ...form, english_translation: e.target.value })} /></div>
            <div className="space-y-1"><Label>Transliteration</Label>
              <Input value={form.transliteration ?? ""} onChange={(e) => setForm({ ...form, transliteration: e.target.value })} /></div>
            <div className="space-y-1"><Label>Example (Arabic with tashkeel)</Label>
              <Textarea value={form.example_arabic ?? ""} dir="rtl" onChange={(e) => setForm({ ...form, example_arabic: e.target.value })} /></div>
            <div className="space-y-1"><Label>Example (English)</Label>
              <Textarea value={form.example_english ?? ""} onChange={(e) => setForm({ ...form, example_english: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="space-y-1"><Label>Image URL (optional override)</Label>
              <Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <div className="space-y-1"><Label>Image alt text</Label>
              <Input value={form.image_alt ?? ""} onChange={(e) => setForm({ ...form, image_alt: e.target.value })} /></div>
            <div className="space-y-1"><Label>Audio URL (optional override)</Label>
              <Input value={form.audio_url ?? ""} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} /></div>
            <div className="space-y-1"><Label>Example audio URL</Label>
              <Input value={form.audio_example_url ?? ""} onChange={(e) => setForm({ ...form, audio_example_url: e.target.value })} /></div>
            <div className="space-y-1"><Label>Card number (order)</Label>
              <Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> <span>Published</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
