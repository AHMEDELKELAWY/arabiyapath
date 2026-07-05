import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Download, FileJson, Upload, ChevronDown, Copy, Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AdminGrammarEditor } from "./AdminGrammarEditor";
import { parseCsv, toCsv, downloadCsv, downloadJson } from "@/lib/flashcards/cardsCsv";

interface Example {
  arabic: string;
  english: string;
  note?: string;
}

interface GrammarRow {
  id: string;
  unit_id: string;
  title: string | null;
  explanation: string | null;
  examples: Example[] | null;
}

interface UnitMin {
  id: string;
  slug: string | null;
  title_en: string | null;
}

interface Props {
  unitId: string;
  units: UnitMin[] | undefined;
}

const CSV_COLUMNS = [
  "Unit",
  "Title",
  "Explanation",
  "Arabic Example",
  "English Translation",
  "Optional Note",
] as const;

/** Group a flat CSV into one grammar row per unit. First non-empty title/explanation wins. */
function groupCsvRows(
  rows: Record<string, string>[],
  units: UnitMin[],
): Array<{ unit_id: string; title: string | null; explanation: string | null; examples: Example[] }> {
  const bySlug = new Map(units.map((u) => [String(u.slug ?? "").toLowerCase(), u]));
  const byTitle = new Map(units.map((u) => [String(u.title_en ?? "").toLowerCase(), u]));
  const byId = new Map(units.map((u) => [u.id, u]));

  const grouped = new Map<
    string,
    { unit_id: string; title: string | null; explanation: string | null; examples: Example[] }
  >();

  for (const r of rows) {
    const key = (r["Unit"] ?? r["unit"] ?? r["unit_id"] ?? r["unit_slug"] ?? "").trim();
    if (!key) continue;
    const u =
      byId.get(key) ||
      bySlug.get(key.toLowerCase()) ||
      byTitle.get(key.toLowerCase());
    if (!u) continue;

    const entry =
      grouped.get(u.id) ??
      { unit_id: u.id, title: null, explanation: null, examples: [] as Example[] };

    const title = (r["Title"] ?? r["title"] ?? "").trim();
    const explanation = (r["Explanation"] ?? r["explanation"] ?? "").trim();
    if (title && !entry.title) entry.title = title;
    if (explanation && !entry.explanation) entry.explanation = explanation;

    const arabic = (r["Arabic Example"] ?? r["arabic"] ?? r["example_arabic"] ?? "").trim();
    const english = (r["English Translation"] ?? r["english"] ?? r["example_english"] ?? "").trim();
    const note = (r["Optional Note"] ?? r["note"] ?? "").trim();
    if (arabic || english) {
      entry.examples.push({ arabic, english, note: note || undefined });
    }

    grouped.set(u.id, entry);
  }
  return Array.from(grouped.values());
}

/** Normalize JSON payload to the same grouped shape. Accepts an array or {grammar:[...]}. */
function normalizeJsonRows(
  parsed: unknown,
  units: UnitMin[],
): Array<{ unit_id: string; title: string | null; explanation: string | null; examples: Example[] }> {
  const list: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.grammar)
      ? (parsed as any).grammar
      : [];
  const bySlug = new Map(units.map((u) => [String(u.slug ?? "").toLowerCase(), u]));
  const byId = new Map(units.map((u) => [u.id, u]));

  return list
    .map((row: any) => {
      const rawUnit = row.unit_id ?? row.unit_slug ?? row.unit ?? "";
      const u = byId.get(String(rawUnit)) || bySlug.get(String(rawUnit).toLowerCase());
      if (!u) return null;
      const examples: Example[] = Array.isArray(row.examples)
        ? row.examples
            .map((e: any) => ({
              arabic: String(e.arabic ?? "").trim(),
              english: String(e.english ?? "").trim(),
              note: e.note ? String(e.note).trim() : undefined,
            }))
            .filter((e: Example) => e.arabic || e.english)
        : [];
      return {
        unit_id: u.id,
        title: row.title ? String(row.title).trim() : null,
        explanation: row.explanation ? String(row.explanation).trim() : null,
        examples,
      };
    })
    .filter(Boolean) as Array<{
      unit_id: string;
      title: string | null;
      explanation: string | null;
      examples: Example[];
    }>;
}

export function AdminGrammarManager({ unitId, units }: Props) {
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const unit = (units ?? []).find((u) => u.id === unitId);
  const unitLabel = unit?.slug || unit?.title_en || "unit";

  // Fetch current unit's grammar row (for Duplicate/Delete/Export).
  const { data: currentRow } = useQuery({
    queryKey: ["admin-fc-grammar", unitId],
    enabled: !!unitId,
    queryFn: async (): Promise<GrammarRow | null> => {
      const { data, error } = await (supabase as any)
        .from("flashcard_unit_grammar")
        .select("id,unit_id,title,explanation,examples")
        .eq("unit_id", unitId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const fetchAll = async (): Promise<GrammarRow[]> => {
    const { data, error } = await (supabase as any)
      .from("flashcard_unit_grammar")
      .select("id,unit_id,title,explanation,examples");
    if (error) throw error;
    return (data ?? []) as GrammarRow[];
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-fc-grammar", unitId] });
    qc.invalidateQueries({ queryKey: ["fc-unit-grammar", unitId] });
  };

  // ---------- Export ----------
  const rowsToCsv = (rows: GrammarRow[]) => {
    const slugById = new Map((units ?? []).map((u) => [u.id, u.slug || u.id]));
    const flat: Record<string, string>[] = [];
    for (const r of rows) {
      const unitKey = String(slugById.get(r.unit_id) ?? r.unit_id);
      const examples = Array.isArray(r.examples) ? r.examples : [];
      if (examples.length === 0) {
        flat.push({
          Unit: unitKey,
          Title: r.title ?? "",
          Explanation: r.explanation ?? "",
          "Arabic Example": "",
          "English Translation": "",
          "Optional Note": "",
        });
      } else {
        examples.forEach((ex, i) => {
          flat.push({
            Unit: unitKey,
            Title: i === 0 ? (r.title ?? "") : "",
            Explanation: i === 0 ? (r.explanation ?? "") : "",
            "Arabic Example": ex.arabic ?? "",
            "English Translation": ex.english ?? "",
            "Optional Note": ex.note ?? "",
          });
        });
      }
    }
    return toCsv(flat, CSV_COLUMNS as unknown as string[]);
  };

  const exportCsv = async (scope: "unit" | "all") => {
    try {
      const rows = scope === "all" ? await fetchAll() : currentRow ? [currentRow] : [];
      if (!rows.length) return toast({ title: "Nothing to export" });
      downloadCsv(`${scope === "all" ? "all-grammar" : `${unitLabel}-grammar`}.csv`, rowsToCsv(rows));
      toast({ title: `Exported ${rows.length} lesson${rows.length === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const exportJson = async (scope: "unit" | "all") => {
    try {
      const rows = scope === "all" ? await fetchAll() : currentRow ? [currentRow] : [];
      if (!rows.length) return toast({ title: "Nothing to export" });
      const slugById = new Map((units ?? []).map((u) => [u.id, u.slug || u.id]));
      const payload = rows.map((r) => ({
        unit_id: r.unit_id,
        unit_slug: slugById.get(r.unit_id) ?? null,
        title: r.title,
        explanation: r.explanation,
        examples: Array.isArray(r.examples) ? r.examples : [],
      }));
      downloadJson(`${scope === "all" ? "all-grammar" : `${unitLabel}-grammar`}.json`, payload);
      toast({ title: `Exported ${rows.length} lesson${rows.length === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  // ---------- Duplicate ----------
  const duplicate = async () => {
    if (!currentRow) return toast({ title: "No grammar lesson to duplicate" });
    const targetSlug = prompt(
      "Enter the target unit slug or id to duplicate this grammar lesson into:",
      "",
    );
    if (!targetSlug) return;
    const target =
      (units ?? []).find(
        (u) =>
          u.id === targetSlug ||
          (u.slug ?? "").toLowerCase() === targetSlug.toLowerCase(),
      );
    if (!target) return toast({ title: "Unit not found", variant: "destructive" });
    const { error } = await (supabase as any)
      .from("flashcard_unit_grammar")
      .upsert(
        {
          unit_id: target.id,
          title: currentRow.title,
          explanation: currentRow.explanation,
          examples: currentRow.examples ?? [],
        },
        { onConflict: "unit_id" },
      );
    if (error) return toast({ title: "Duplicate failed", description: error.message, variant: "destructive" });
    toast({ title: `Duplicated into ${target.slug || target.title_en}` });
    qc.invalidateQueries({ queryKey: ["admin-fc-grammar"] });
  };

  // ---------- Delete ----------
  const deleteLesson = async () => {
    if (!currentRow) return toast({ title: "No grammar lesson to delete" });
    if (!confirm("Delete this grammar lesson? This cannot be undone.")) return;
    const { error } = await (supabase as any)
      .from("flashcard_unit_grammar")
      .delete()
      .eq("id", currentRow.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Grammar lesson deleted" });
    invalidate();
  };

  // ---------- Import ----------
  const runImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    try {
      const text = await pendingFile.text();
      const isJson = pendingFile.name.toLowerCase().endsWith(".json");
      const parsedRows = isJson
        ? normalizeJsonRows(JSON.parse(text), units ?? [])
        : groupCsvRows(parseCsv(text), units ?? []);

      if (!parsedRows.length) {
        toast({ title: "Nothing to import", description: "No rows matched an existing unit.", variant: "destructive" });
        setImporting(false);
        return;
      }

      let ok = 0;
      let fail = 0;

      if (importMode === "merge") {
        // Fetch existing rows for merging examples.
        const ids = parsedRows.map((r) => r.unit_id);
        const { data: existing, error: exErr } = await (supabase as any)
          .from("flashcard_unit_grammar")
          .select("unit_id,title,explanation,examples")
          .in("unit_id", ids);
        if (exErr) throw exErr;
        const existingMap = new Map<string, GrammarRow>(
          (existing ?? []).map((r: any) => [r.unit_id as string, r as GrammarRow]),
        );

        for (const row of parsedRows) {
          const prev = existingMap.get(row.unit_id);
          const mergedExamples: Example[] = [
            ...((prev?.examples as Example[] | null) ?? []),
            ...row.examples,
          ];
          const payload = {
            unit_id: row.unit_id,
            title: row.title ?? prev?.title ?? null,
            explanation: row.explanation ?? prev?.explanation ?? null,
            examples: mergedExamples,
          };
          const { error } = await (supabase as any)
            .from("flashcard_unit_grammar")
            .upsert(payload, { onConflict: "unit_id" });
          if (error) fail++; else ok++;
        }
      } else {
        // Replace: overwrite each row entirely.
        for (const row of parsedRows) {
          const { error } = await (supabase as any)
            .from("flashcard_unit_grammar")
            .upsert(
              {
                unit_id: row.unit_id,
                title: row.title,
                explanation: row.explanation,
                examples: row.examples,
              },
              { onConflict: "unit_id" },
            );
          if (error) fail++; else ok++;
        }
      }

      toast({
        title: `Import ${importMode === "merge" ? "merged" : "replaced"}`,
        description: `Success: ${ok} · Failed: ${fail}`,
        variant: fail ? "destructive" : "default",
      });
      qc.invalidateQueries({ queryKey: ["admin-fc-grammar"] });
      setImportOpen(false);
      setPendingFile(null);
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const sampleUnit = (units ?? [])[0]?.slug || "unit-slug";
    const csv = toCsv(
      [
        {
          Unit: sampleUnit,
          Title: "Definite article ال",
          Explanation: "Attach ال to make a noun definite.",
          "Arabic Example": "الْبَيْتُ",
          "English Translation": "the house",
          "Optional Note": "Sun letters assimilate.",
        },
        {
          Unit: sampleUnit,
          Title: "",
          Explanation: "",
          "Arabic Example": "الشَّمْسُ",
          "English Translation": "the sun",
          "Optional Note": "Sun letter — ل is silent.",
        },
      ],
      CSV_COLUMNS as unknown as string[],
    );
    downloadCsv("grammar-template.csv", csv);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar — mirrors Learn/Speaking Content style */}
      <Card className="p-3 flex flex-wrap gap-2 items-center border rounded-md bg-card">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => exportCsv("unit")} disabled={!unitId || !currentRow}>
              Export This Unit (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportCsv("all")}>
              Export All Grammar (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FileJson className="w-4 h-4 mr-2" /> Backup <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => exportJson("unit")} disabled={!unitId || !currentRow}>
              This Unit (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportJson("all")}>
              All Grammar (JSON)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" /> Import CSV / JSON
        </Button>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" /> CSV Template
        </Button>
        <Button variant="outline" size="sm" onClick={duplicate} disabled={!currentRow}>
          <Copy className="w-4 h-4 mr-2" /> Duplicate to Another Unit
        </Button>
        <Button variant="outline" size="sm" onClick={deleteLesson} disabled={!currentRow}>
          <Trash2 className="w-4 h-4 mr-2 text-destructive" /> Delete Lesson
        </Button>
      </Card>

      {/* Per-unit editor */}
      <AdminGrammarEditor unitId={unitId} />

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Grammar (CSV or JSON)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">File</Label>
              <input
                type="file"
                accept=".csv,.json,application/json,text/csv"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                CSV columns: Unit, Title, Explanation, Arabic Example, English Translation, Optional Note.
                Multiple rows with the same Unit combine into one lesson with multiple examples.
              </p>
            </div>

            <div>
              <Label className="text-sm">Mode</Label>
              <RadioGroup
                value={importMode}
                onValueChange={(v) => setImportMode(v as "merge" | "replace")}
                className="mt-2 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="merge" id="mode-merge" className="mt-1" />
                  <Label htmlFor="mode-merge" className="font-normal">
                    <span className="font-medium">Merge</span> — append imported examples to existing lessons.
                    Title/explanation only fill in when currently empty.
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="replace" id="mode-replace" className="mt-1" />
                  <Label htmlFor="mode-replace" className="font-normal">
                    <span className="font-medium">Replace</span> — overwrite the grammar lesson for each unit
                    in the file with the imported content.
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={runImport} disabled={!pendingFile || importing}>
              {importing ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Minimal Card wrapper (avoids an extra import cycle with shadcn Card component styling).
function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return <div className={`bg-card ${className}`} {...rest} />;
}
