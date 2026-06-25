import { useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, FileWarning, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  parseCsv, toCsv, downloadCsv, normalizeArabic, parseBool, chunked,
} from "@/lib/flashcards/cardsCsv";

type Mode = "add" | "update" | "replace";
type DupAction = "skip" | "overwrite";
type Kind = "learn" | "speaking";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitSlug: string;
  kind: Kind;
  onComplete: () => void;
}

interface PreviewStats {
  found: number;
  valid: number;
  invalid: number;
  missingIds: number;
  duplicates: number;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  deleted: number;
  errors: { row: number; reason: string; data: Record<string, string> }[];
}

function rowIsValid(r: Record<string, string>): boolean {
  return !!(r.arabic_text && r.english_translation);
}

export function ImportCardsDialog({
  open, onOpenChange, unitId, unitSlug, kind, onComplete,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<Mode>("add");
  const [dupAction, setDupAction] = useState<DupAction>("skip");
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [preview, setPreview] = useState<PreviewStats | null>(null);
  const [existing, setExisting] = useState<{ id: string; arabic_text: string }[]>([]);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setRows(null); setFilename(""); setPreview(null); setExisting([]);
    setConfirmSlug(""); setConfirmDelete(""); setResult(null);
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setFilename(file.name);
      setRows(parsed);
      setResult(null);

      // Load existing for duplicate / id checks
      const { data: ex } = await (supabase as any)
        .from("flashcards")
        .select("id,arabic_text")
        .eq("unit_id", unitId)
        .eq("kind", kind);
      const existingRows = (ex ?? []) as { id: string; arabic_text: string }[];
      setExisting(existingRows);

      const existingIds = new Set(existingRows.map((r) => r.id));
      const existingArabic = new Set(existingRows.map((r) => normalizeArabic(r.arabic_text)));

      let valid = 0, invalid = 0, missingIds = 0, duplicates = 0;
      for (const r of parsed) {
        if (!rowIsValid(r)) { invalid++; continue; }
        valid++;
        if (!r.id || !existingIds.has(r.id)) missingIds++;
        if (existingArabic.has(normalizeArabic(r.arabic_text))) duplicates++;
      }
      setPreview({ found: parsed.length, valid, invalid, missingIds, duplicates });
    } catch (e: any) {
      toast({ title: "Could not read file", description: e.message, variant: "destructive" });
    }
  };

  const canExecute = useMemo(() => {
    if (!rows || !preview || busy) return false;
    if (mode === "replace") {
      return confirmSlug === unitSlug && confirmDelete === "DELETE";
    }
    return preview.valid > 0;
  }, [rows, preview, busy, mode, confirmSlug, confirmDelete, unitSlug]);

  const buildPayload = (r: Record<string, string>, fallbackOrder: number) => ({
    unit_id: unitId,
    kind,
    arabic_text: String(r.arabic_text),
    english_translation: String(r.english_translation),
    transliteration: r.transliteration || null,
    image_url: r.image_url || null,
    audio_url: r.audio_url || null,
    published: parseBool(r.published),
    order_index: Number(r.order_index ?? fallbackOrder) || fallbackOrder,
  });

  const execute = async () => {
    if (!rows) return;
    setBusy(true);
    const res: ImportResult = { created: 0, updated: 0, skipped: 0, deleted: 0, errors: [] };
    try {
      if (mode === "replace") {
        const { count, error: delErr } = await (supabase as any)
          .from("flashcards")
          .delete({ count: "exact" })
          .eq("unit_id", unitId)
          .eq("kind", kind);
        if (delErr) throw delErr;
        res.deleted = count ?? 0;

        const insertRows: any[] = [];
        rows.forEach((r, i) => {
          if (!rowIsValid(r)) {
            res.skipped++;
            res.errors.push({ row: i + 2, reason: "missing fields", data: r });
            return;
          }
          insertRows.push(buildPayload(r, i + 1));
        });
        await chunked(insertRows, 100, async (chunk) => {
          const { error } = await (supabase as any).from("flashcards").insert(chunk);
          if (error) {
            res.errors.push({ row: 0, reason: error.message, data: {} as any });
          } else {
            res.created += chunk.length;
          }
        });
      } else if (mode === "update") {
        const existingIds = new Set(existing.map((e) => e.id));
        const updates: { id: string; patch: any; row: number }[] = [];
        rows.forEach((r, i) => {
          if (!r.id) {
            res.skipped++;
            res.errors.push({ row: i + 2, reason: "missing id", data: r });
            return;
          }
          if (!existingIds.has(r.id)) {
            res.skipped++;
            res.errors.push({ row: i + 2, reason: "unknown id (not in this unit/kind)", data: r });
            return;
          }
          if (!rowIsValid(r)) {
            res.skipped++;
            res.errors.push({ row: i + 2, reason: "missing fields", data: r });
            return;
          }
          const patch: any = {
            arabic_text: r.arabic_text,
            english_translation: r.english_translation,
            transliteration: r.transliteration || null,
          };
          if (r.image_url !== undefined && r.image_url !== "") patch.image_url = r.image_url;
          if (r.audio_url !== undefined && r.audio_url !== "") patch.audio_url = r.audio_url;
          if (r.published !== undefined && r.published !== "") patch.published = parseBool(r.published);
          if (r.order_index !== undefined && r.order_index !== "") patch.order_index = Number(r.order_index);
          updates.push({ id: r.id, patch, row: i + 2 });
        });
        await chunked(updates, 50, async (chunk) => {
          await Promise.all(chunk.map(async (u) => {
            const { error } = await (supabase as any)
              .from("flashcards").update(u.patch).eq("id", u.id).eq("unit_id", unitId);
            if (error) {
              res.errors.push({ row: u.row, reason: error.message, data: u.patch });
            } else {
              res.updated++;
            }
          }));
        });
      } else {
        // add new
        const existingArabic = new Map(existing.map((e) => [normalizeArabic(e.arabic_text), e.id]));
        const inserts: any[] = [];
        const overwrites: { id: string; patch: any; row: number }[] = [];
        let nextOrder = existing.length + 1;
        rows.forEach((r, i) => {
          if (!rowIsValid(r)) {
            res.skipped++;
            res.errors.push({ row: i + 2, reason: "missing fields", data: r });
            return;
          }
          const dupId = existingArabic.get(normalizeArabic(r.arabic_text));
          if (dupId) {
            if (dupAction === "skip") {
              res.skipped++;
              res.errors.push({ row: i + 2, reason: "duplicate (skipped)", data: r });
              return;
            }
            overwrites.push({ id: dupId, patch: buildPayload(r, nextOrder), row: i + 2 });
            return;
          }
          inserts.push(buildPayload(r, nextOrder++));
        });

        await chunked(inserts, 100, async (chunk) => {
          const { error } = await (supabase as any).from("flashcards").insert(chunk);
          if (error) {
            res.errors.push({ row: 0, reason: error.message, data: {} as any });
          } else {
            res.created += chunk.length;
          }
        });
        await chunked(overwrites, 50, async (chunk) => {
          await Promise.all(chunk.map(async (u) => {
            const { error } = await (supabase as any)
              .from("flashcards").update(u.patch).eq("id", u.id);
            if (error) {
              res.errors.push({ row: u.row, reason: error.message, data: u.patch });
            } else {
              res.updated++;
            }
          }));
        });
      }
      setResult(res);
      onComplete();
      toast({ title: "Import complete", description: `+${res.created} · ~${res.updated} · skip ${res.skipped}` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const downloadErrors = () => {
    if (!result?.errors.length) return;
    const csv = toCsv(
      result.errors.map((e) => ({ row_number: e.row, reason: e.reason, data: JSON.stringify(e.data) })),
      ["row_number", "reason", "data"],
    );
    downloadCsv(`${unitSlug || "unit"}-${kind}-import-errors.csv`, csv);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {kind === "learn" ? "Learn" : "Speaking"} Cards</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mode</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <label className="flex items-start gap-2 cursor-pointer">
                <RadioGroupItem value="add" />
                <div>
                  <div className="font-medium">Add New Cards</div>
                  <div className="text-xs text-muted-foreground">Insert only. Existing cards are not touched.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <RadioGroupItem value="update" />
                <div>
                  <div className="font-medium">Update Existing Cards</div>
                  <div className="text-xs text-muted-foreground">Match by <code>id</code>. Rows without an id are skipped.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <RadioGroupItem value="replace" />
                <div>
                  <div className="font-medium text-destructive">Replace Entire Unit</div>
                  <div className="text-xs text-muted-foreground">Deletes every {kind} card in this unit, then imports.</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {mode === "add" && (
            <div className="space-y-2">
              <Label>When a duplicate is found</Label>
              <RadioGroup value={dupAction} onValueChange={(v) => setDupAction(v as DupAction)}>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="skip" /> Skip (default)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value="overwrite" /> Overwrite existing card
                </label>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>CSV file</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Choose CSV
              </Button>
              {filename && <span className="text-xs text-muted-foreground truncate">{filename}</span>}
            </div>
          </div>

          {preview && (
            <Card>
              <CardContent className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                <Stat label="Rows Found" value={preview.found} />
                <Stat label="Valid" value={preview.valid} />
                <Stat label="Invalid" value={preview.invalid} tone={preview.invalid ? "warn" : undefined} />
                <Stat label="Missing IDs" value={preview.missingIds} tone={mode === "update" && preview.missingIds ? "warn" : undefined} />
                <Stat label="Potential Dupes" value={preview.duplicates} tone={mode === "add" && preview.duplicates ? "warn" : undefined} />
              </CardContent>
            </Card>
          )}

          {mode === "replace" && rows && (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                <FileWarning className="w-4 h-4" /> This will permanently delete every {kind} card in this unit.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Type the unit slug to confirm: <code>{unitSlug}</code></Label>
                <Input value={confirmSlug} onChange={(e) => setConfirmSlug(e.target.value)} placeholder={unitSlug} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Then type <code>DELETE</code></Label>
                <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="DELETE" />
              </div>
            </div>
          )}

          {result && (
            <Card>
              <CardContent className="p-3 space-y-2 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Stat label="Created" value={result.created} />
                  <Stat label="Updated" value={result.updated} />
                  <Stat label="Skipped" value={result.skipped} />
                  <Stat label="Deleted" value={result.deleted} />
                  <Stat label="Errors" value={result.errors.length} tone={result.errors.length ? "warn" : undefined} />
                </div>
                {result.errors.length > 0 && (
                  <Button variant="outline" size="sm" onClick={downloadErrors}>
                    <Download className="w-3 h-3 mr-1" /> Download Error Report
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={execute} disabled={!canExecute}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {mode === "replace" ? "Replace Unit" : mode === "update" ? "Update Cards" : "Add Cards"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${tone === "warn" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
