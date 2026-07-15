import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminScopePicker } from "@/components/admin/AdminScopePicker";
import { useAdminFlashcardScope } from "@/components/admin/AdminScopeContext";
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
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Loader2, Upload, Images, Search, ListOrdered,
  CheckCircle2, EyeOff, Eye, ImageIcon, Volume2, Trash2, Sparkles,
  Download, FileJson, ChevronDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BulkImageUploadDialog } from "@/components/admin/flashcards/BulkImageUploadDialog";
import { ImportCardsDialog } from "@/components/admin/flashcards/ImportCardsDialog";
import { CardRow } from "@/components/admin/flashcards/CardRow";
import { AudioRecorder } from "@/components/admin/flashcards/AudioRecorder";
import { toCsv, downloadCsv, downloadJson, CARD_CSV_COLUMNS } from "@/lib/flashcards/cardsCsv";

const KIND_LABEL: Record<CardKind, string> = {
  learn: "Learn",
  speaking: "Speaking",
  grammar: "Grammar",
};

const PAGE_SIZE = 20;

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

type CardKind = "speaking" | "learn" | "grammar";

export default function AdminFlashcardCards({
  embedded = false,
  embeddedUnitId,
  embeddedKind,
}: {
  embedded?: boolean;
  embeddedUnitId?: string;
  embeddedKind?: CardKind;
} = {}) {
  const [params, setParams] = useSearchParams();
  const scope = useAdminFlashcardScope();
  const urlUnit = params.get("unit") || "";
  const unitId = embedded ? (embeddedUnitId || "") : (scope.unitId || urlUnit || "");
  const kindParam = (params.get("kind") as CardKind) || "learn";
  const kind: CardKind = embedded
    ? (embeddedKind || "learn")
    : (kindParam === "speaking" ? "speaking" : kindParam === "grammar" ? "grammar" : "learn");

  // Sync URL ?unit= with the shared scope so deep-links still work, and hydrate
  // scope from URL when arriving from a link that pre-selected a unit.
  useEffect(() => {
    if (embedded) return;
    if (urlUnit && urlUnit !== scope.unitId) {
      // Try to find which level the URL unit belongs to so both selectors update.
      const opt = scope.unitOptions.find((u) => u.id === urlUnit);
      if (opt?.levelId && opt.levelId !== scope.levelId) scope.setLevel(opt.levelId);
      scope.setUnit(urlUnit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUnit, scope.unitOptions.length, embedded]);

  useEffect(() => {
    if (embedded) return;
    if (scope.unitId && scope.unitId !== urlUnit) {
      const p = new URLSearchParams(params);
      p.set("unit", scope.unitId);
      p.set("kind", kind);
      setParams(p, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.unitId, embedded]);
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
  const [page, setPage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
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

  // Lightweight whole-unit summary (id + small flag columns only) — used for
  // stats, duplicate detection, renumbering, copy-to-learn, and pagination total.
  const { data: summary } = useQuery({
    queryKey: ["admin-fc-cards-summary", unitId, kind],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("id,order_index,published,image_url,audio_url,arabic_text,english_translation")
        .eq("unit_id", unitId)
        .eq("kind", kind)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalCards = summary?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  // Paged fetch of full card rows for the visible page.
  const { data: pageCards } = useQuery({
    queryKey: ["admin-fc-cards", unitId, kind, safePage, sortKey],
    enabled: !!unitId,
    queryFn: async () => {
      const from = safePage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const ascending = true;
      const column =
        sortKey === "arabic" ? "arabic_text" :
        sortKey === "published" ? "published" :
        "order_index";
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("*")
        .eq("unit_id", unitId)
        .eq("kind", kind)
        .order(column, { ascending: column !== "published" })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Compat alias for existing references in this file.
  const cards = pageCards;

  const unitSlug = useMemo(
    () => (units ?? []).find((u: any) => u.id === unitId)?.slug || "",
    [units, unitId],
  );
  const hasSlug = !!unitSlug;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-fc-cards", unitId] });
    qc.invalidateQueries({ queryKey: ["admin-fc-cards-summary", unitId] });
  };

  // Reset page when filters change.
  useEffect(() => { setPage(0); }, [unitId, kind, search]);

  const stats = useMemo(() => {
    const list = summary ?? [];
    return {
      total: list.length,
      published: list.filter((c: any) => c.published).length,
      draft: list.filter((c: any) => !c.published).length,
      images: list.filter((c: any) => c.image_url).length,
      audio: list.filter((c: any) => c.audio_url).length,
    };
  }, [summary]);

  const duplicateOrders = useMemo(() => {
    const counts = new Map<number, number>();
    (summary ?? []).forEach((c: any) => counts.set(c.order_index, (counts.get(c.order_index) ?? 0) + 1));
    return new Set(Array.from(counts.entries()).filter(([, n]) => n > 1).map(([k]) => k));
  }, [summary]);

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
    return list;
  }, [cards, search]);

  const startNew = () => {
    if (!unitId) return toast({ title: "Pick a unit first" });
    setEditing({});
    setForm({
      arabic_text: "", english_translation: "", transliteration: "",
      example_arabic: "", example_english: "", image_url: "", image_alt: "",
      audio_url: "", audio_example_url: "", notes: "", published: false,
      order_index: totalCards + 1,
    });
  };

  const startEdit = (c: any) => { setEditing(c); setForm({ ...c }); };

  const save = async () => {
    const payload = { ...form, unit_id: unitId, kind };
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
      if (!unitSlug) throw new Error("Unit has no slug");
      const { data, error } = await supabase.functions.invoke("generate-flashcard-image", { body: { cardId: c.id } });
      if (error) throw error;
      const b64 = (data as any)?.pngBase64;
      if (!b64) throw new Error("No image returned from generator");
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const { uploadAndWriteCardImage } = await import("@/lib/flashcards/imageWrite");
      await uploadAndWriteCardImage({
        cardId: c.id,
        unitSlug,
        kind: c.kind ?? kind,
        orderIndex: c.order_index,
        source: blob,
        imageAlt: c.image_alt || c.english_translation,
      });
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
          kind,
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

  // ---- Bulk actions (scoped to current kind) ----
  const bulkSetPublished = async (published: boolean) => {
    if (!confirm(`${published ? "Publish" : "Unpublish"} all ${KIND_LABEL[kind]} cards in this unit?`)) return;
    setBulkBusy("publish");
    const { error } = await (supabase as any)
      .from("flashcards").update({ published })
      .eq("unit_id", unitId).eq("kind", kind);
    setBulkBusy(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: published ? "All cards published" : "All cards unpublished" });
    invalidate();
  };

  const bulkClear = async (column: "image_url" | "audio_url") => {
    const label = column === "image_url" ? "images" : "audio";
    if (!confirm(`Remove ALL ${label} for ${KIND_LABEL[kind]} cards in this unit? This cannot be undone.`)) return;
    setBulkBusy(column);
    const { error } = await (supabase as any)
      .from("flashcards").update({ [column]: null })
      .eq("unit_id", unitId).eq("kind", kind);
    setBulkBusy(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `All ${label} removed` });
    invalidate();
  };

  const bulkGenerateMissing = async (asset: "image" | "audio") => {
    const list = (summary ?? []).filter((c: any) =>
      asset === "image" ? !c.image_url : !c.audio_url,
    );
    if (!list.length) return toast({ title: `No cards missing ${asset}` });
    if (!confirm(`Generate ${asset} for ${list.length} card${list.length === 1 ? "" : "s"}?`)) return;
    setBulkBusy(`gen-${asset}`);
    let ok = 0, fail = 0;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      try {
        if (asset === "image") {
          await genImage(c);
        } else {
          const { error } = await supabase.functions.invoke("generate-flashcard-audio", { body: { cardId: c.id, kind: "main" } });
          if (error) throw error;
        }
        ok++;
      } catch {
        fail++;
      }
      toast({ title: `Generating ${asset}…`, description: `${i + 1} / ${list.length}` });
    }
    setBulkBusy(null);
    toast({
      title: `Bulk ${asset} generation complete`,
      description: `Success: ${ok} · Failed: ${fail}`,
      variant: fail ? "destructive" : "default",
    });
    invalidate();
  };

  // ---- Copy Selected To Learn ----
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copySelectedToLearn = async () => {
    if (kind !== "speaking") return;
    if (!selected.size) return toast({ title: "Select at least one Speaking card first" });
    if (!confirm(`Copy ${selected.size} card(s) to Learn?`)) return;
    setCopying(true);
    try {
      const { data: existingLearn, error: lerr } = await (supabase as any)
        .from("flashcards").select("order_index")
        .eq("unit_id", unitId).eq("kind", "learn")
        .order("order_index", { ascending: false }).limit(1);
      if (lerr) throw lerr;
      let nextOrder = ((existingLearn?.[0]?.order_index as number) ?? 0) + 1;

      // Fetch full rows for selected ids (may span pages).
      const ids = Array.from(selected);
      const { data: sources, error: srcErr } = await (supabase as any)
        .from("flashcards").select("*").in("id", ids).order("order_index");
      if (srcErr) throw srcErr;

      const payload = (sources ?? []).map((c: any) => ({
        unit_id: unitId,
        kind: "learn" as const,
        arabic_text: c.arabic_text,
        english_translation: c.english_translation,
        transliteration: c.transliteration ?? null,
        example_arabic: c.example_arabic ?? null,
        example_english: c.example_english ?? null,
        image_url: c.image_url ?? null,
        image_alt: c.image_alt ?? null,
        audio_url: c.audio_url ?? null,
        audio_example_url: c.audio_example_url ?? null,
        notes: c.notes ?? null,
        order_index: nextOrder++,
        published: !!c.published,
      }));

      const { error } = await (supabase as any).from("flashcards").insert(payload);
      if (error) throw error;
      toast({ title: `Copied ${payload.length} card(s) to Learn` });
      setSelected(new Set());
      invalidate();
    } catch (e: any) {
      toast({ title: "Copy failed", description: e.message, variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const renumberCards = async () => {
    if (!confirm("Recalculate card numbers? This will renumber every card 1..N in the current order.")) return;
    setBulkBusy("renumber");
    const ordered = [...(summary ?? [])].sort((a: any, b: any) => a.order_index - b.order_index);
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
    const list = [...(summary ?? [])].sort((a: any, b: any) => a.order_index - b.order_index);
    const idx = list.findIndex((c: any) => c.order_index === n);
    if (idx < 0) {
      toast({ title: `No card #${n} in this unit` });
      return;
    }
    const target = list[idx];
    setSearch("");
    setPage(Math.floor(idx / PAGE_SIZE));
    setTimeout(() => {
      const el = document.getElementById(`card-${target.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(target.id);
      setTimeout(() => setHighlightId(null), 3000);
    }, 200);
  };

  // ---- Per-card duplicate ----
  const duplicateCard = async (c: any) => {
    const maxOrder = (summary ?? []).reduce(
      (m: number, x: any) => Math.max(m, Number(x.order_index) || 0),
      0,
    );
    const payload = {
      unit_id: unitId,
      kind,
      arabic_text: `${c.arabic_text} - Copy`,
      english_translation: `${c.english_translation} - Copy`,
      transliteration: c.transliteration ?? null,
      example_arabic: c.example_arabic ?? null,
      example_english: c.example_english ?? null,
      image_url: null,
      audio_url: null,
      audio_example_url: null,
      image_alt: c.image_alt ?? null,
      notes: c.notes ?? null,
      published: false,
      order_index: maxOrder + 1,
    };
    const { error } = await (supabase as any).from("flashcards").insert(payload);
    if (error) return toast({ title: "Duplicate failed", description: error.message, variant: "destructive" });
    toast({ title: "Card duplicated" });
    invalidate();
  };

  // ---- Move up / down ----
  const moveCard = async (c: any, direction: -1 | 1) => {
    const ordered = [...(summary ?? [])].sort((a: any, b: any) => a.order_index - b.order_index);
    const idx = ordered.findIndex((x: any) => x.id === c.id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const other = ordered[swapIdx];
    // Swap order_index values. Use a temporary high value to avoid unique conflicts if any.
    const tmp = 1_000_000 + Math.floor(Math.random() * 1000);
    const { error: e1 } = await (supabase as any).from("flashcards").update({ order_index: tmp }).eq("id", c.id);
    if (e1) return toast({ title: "Move failed", description: e1.message, variant: "destructive" });
    const { error: e2 } = await (supabase as any).from("flashcards").update({ order_index: c.order_index }).eq("id", other.id);
    if (e2) return toast({ title: "Move failed", description: e2.message, variant: "destructive" });
    const { error: e3 } = await (supabase as any).from("flashcards").update({ order_index: other.order_index }).eq("id", c.id);
    if (e3) return toast({ title: "Move failed", description: e3.message, variant: "destructive" });
    invalidate();
  };

  // ---- Selection helpers ----
  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = summary ?? [];
    if (!q) return list;
    const asNum = Number(q);
    return list.filter((c: any) =>
      (c.arabic_text || "").toLowerCase().includes(q) ||
      (c.english_translation || "").toLowerCase().includes(q) ||
      (Number.isFinite(asNum) && c.order_index === asNum),
    );
  }, [summary, search]);

  const selectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      (visibleCards ?? []).forEach((c: any) => next.add(c.id));
      return next;
    });
  };
  const selectAllInFilter = () => {
    setSelected(new Set(filteredSummary.map((c: any) => c.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} card${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBulkBusy("delete");
    const { error } = await (supabase as any).from("flashcards").delete().in("id", ids);
    setBulkBusy(null);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: `Deleted ${ids.length} card${ids.length === 1 ? "" : "s"}` });
    clearSelection();
    invalidate();
  };

  // ---- Export / Backup ----
  const fetchUnitCards = async (forKind?: CardKind) => {
    let q = (supabase as any).from("flashcards").select("*").eq("unit_id", unitId);
    if (forKind) q = q.eq("kind", forKind);
    const { data, error } = await q.order("kind").order("order_index");
    if (error) throw error;
    return data ?? [];
  };

  const exportCsv = async (scope: CardKind | "all") => {
    try {
      const rows = await fetchUnitCards(scope === "all" ? undefined : scope);
      const csv = toCsv(rows, CARD_CSV_COLUMNS as unknown as string[]);
      const name = `${unitSlug || "unit"}-${scope}-cards.csv`;
      downloadCsv(name, csv);
      toast({ title: `Exported ${rows.length} card${rows.length === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const exportBackup = async (scope: CardKind | "all") => {
    try {
      const { data: unit, error: uerr } = await (supabase as any)
        .from("flashcard_units").select("*").eq("id", unitId).single();
      if (uerr) throw uerr;
      const cards = await fetchUnitCards(scope === "all" ? undefined : scope);
      const suffix = scope === "all" ? "backup" : `${scope}-backup`;
      downloadJson(`${unitSlug || "unit"}-${suffix}.json`, { unit, cards });
      toast({ title: `Backup ready (${cards.length} card${cards.length === 1 ? "" : "s"})` });
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    }
  };


  return (
    <AdminLayout>
      <AdminScopePicker
        scope="flashcard"
        hint={
          scope.currentLevel && scope.currentUnit
            ? `Working in: ${scope.currentLevel.label} / ${scope.currentUnit.title}`
            : scope.currentLevel
              ? `Pick a unit in ${scope.currentLevel.label} to manage its cards.`
              : "Pick a Course / Level and a Unit to manage its content."
        }
      />
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">
            {KIND_LABEL[kind]} Content
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!unitId}>
                <Download className="w-4 h-4 mr-2" /> Export <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportCsv("learn")}>Export Learn Cards (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv("speaking")}>Export Speaking Cards (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv("grammar")}>Export Grammar Cards (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv("all")}>Export Entire Unit (CSV)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!unitId}>
                <FileJson className="w-4 h-4 mr-2" /> Backup <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportBackup("learn")}>Learn Backup (JSON)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportBackup("speaking")}>Speaking Backup (JSON)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportBackup("grammar")}>Grammar Backup (JSON)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportBackup("all")}>Full Unit Backup (JSON)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" disabled={!unitId} onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </Button>
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
        <ImportCardsDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          unitId={unitId}
          unitSlug={unitSlug}
          kind={kind}
          onComplete={invalidate}
        />
      )}

      {unitId && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-2">
          <span className="text-sm font-medium px-2">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={bulkBusy === "delete"}>
            {bulkBusy === "delete" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
            Delete Selected
          </Button>
          {kind === "speaking" && (
            <Button size="sm" onClick={copySelectedToLearn} disabled={copying}>
              {copying ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
              Copy to Learn
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={selectAllOnPage}>Select page</Button>
          <Button size="sm" variant="outline" onClick={selectAllInFilter}>Select all in filter ({filteredSummary.length})</Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
        </div>
      )}

      {unitId && (
        <div className="flex gap-1 mb-3 border-b">
          {([
            { v: "learn", label: "Learn Content" },
            { v: "speaking", label: "Speaking Content" },
            { v: "grammar", label: "Grammar Content" },
          ] as { v: CardKind; label: string }[]).map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setKind(t.v)}
              className={
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
                (kind === t.v
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {unitId && kind !== "grammar" && (
        <div className="mb-6 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
          <div>
            <p className="text-foreground font-medium">Learn — Spoken Arabic vocabulary only</p>
            <p>Single concept, full tashkeel, final sukoon style. Examples: <span dir="rtl" className="text-foreground">قَلَمْ · حَقِيبَةْ · كُرَّاسَةْ</span></p>
          </div>
          <div>
            <p className="text-foreground font-medium">Speaking — complete meaningful sentences</p>
            <p>Full tashkeel, image matches the full sentence.</p>
          </div>
          <p className="italic">Listening and Test Yourself are generated automatically from Learn + Speaking cards — no separate authoring.</p>
        </div>
      )}
      {unitId && kind === "grammar" && (
        <div className="mb-6 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <p className="text-foreground font-medium">Grammar — one example per card</p>
          <p>Each card = a single grammar example: Arabic sentence, English translation, and a short grammar note in the notes field. Use the same image + audio workflow as Learn and Speaking.</p>
        </div>
      )}


      {unitId && (
        <BulkImageUploadDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          unitId={unitId}
          unitSlug={unitSlug}
          kind={kind}
          onComplete={invalidate}
        />
      )}

      {!unitId ? (
        <p className="text-muted-foreground">Pick a unit to manage its content.</p>
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
              <p className="text-sm text-muted-foreground">
                No {KIND_LABEL[kind]} cards yet. Use New Card, Import CSV/JSON{kind === "learn" ? ", or Copy from Speaking." : "."}
              </p>
            ) : (
              visibleCards.map((c: any, idx: number) => {
                const sortedSummary = [...(summary ?? [])].sort((a: any, b: any) => a.order_index - b.order_index);
                const summaryIdx = sortedSummary.findIndex((x: any) => x.id === c.id);
                return (
                  <CardRow
                    key={c.id}
                    card={c}
                    unitFolder={unitSlug}
                    duplicate={duplicateOrders.has(c.order_index)}
                    highlighted={highlightId === c.id}
                    busy={busyId === c.id}
                    selectable
                    selected={selected.has(c.id)}
                    onToggleSelect={() => toggleSelect(c.id)}
                    onBusyChange={setBusyId}
                    onMutated={invalidate}
                    onEdit={startEdit}
                    onDelete={del}
                    onDuplicate={duplicateCard}
                    onMoveUp={(card) => moveCard(card, -1)}
                    onMoveDown={(card) => moveCard(card, 1)}
                    canMoveUp={summaryIdx > 0}
                    canMoveDown={summaryIdx >= 0 && summaryIdx < sortedSummary.length - 1}
                    onGenImage={genImage}
                    onGenAudio={genAudio}
                  />
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalCards > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Total: <strong className="text-foreground">{totalCards}</strong> · Showing {safePage * PAGE_SIZE + 1}–{Math.min(totalCards, (safePage + 1) * PAGE_SIZE)}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
                  Previous
                </Button>
                <span className="text-sm">Page {safePage + 1} of {totalPages}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>
                  Next
                </Button>
              </div>
            </div>
          )}
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
            <div className="space-y-1"><Label>{kind === "grammar" ? "Grammar Note" : "Notes"}</Label>
              <Textarea value={form.notes ?? ""} rows={kind === "grammar" ? 5 : 3} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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

            {editing?.id && (
              <div className="space-y-1 pt-2 border-t">
                <Label>Recorded audio</Label>
                <AudioRecorder
                  cardId={editing.id}
                  audioUrl={form.audio_url}
                  onChanged={(url) => { setForm((f: any) => ({ ...f, audio_url: url ?? "" })); invalidate(); }}
                />
                <p className="text-xs text-muted-foreground pt-1">
                  Recording uploads directly as audio/webm to flashcards/audio/{editing.id}.webm and replaces any existing audio.
                </p>
              </div>
            )}
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
