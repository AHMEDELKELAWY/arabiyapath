import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  parseLessonsCsv,
  mergeCsvMediaSettings,
  lessonsToCsv,
  LESSON_CSV_TEMPLATE,
  LESSON_CSV_COLUMNS,
  type LessonCsvRow,
} from "@/lib/admin/lessonsCsv";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: any[];
  lessons: any[];
  defaultUnitId?: string;
}

type Planned = {
  row: LessonCsvRow;
  unitId?: string;
  action: "create" | "update" | "skip";
  existingId?: string;
  reason?: string;
};

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function LessonBulkImportDialog({
  open,
  onOpenChange,
  units,
  lessons,
  defaultUnitId,
}: Props) {
  const queryClient = useQueryClient();
  const [fallbackUnit, setFallbackUnit] = useState<string>(defaultUnitId ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const buildPlan = (rows: LessonCsvRow[], unitFallback: string): Planned[] =>
    rows.map((row) => {
      const unitId = row.unit_id || unitFallback || undefined;
      if (!unitId) {
        return { row, action: "skip", reason: "No unit_id in the row and no fallback unit selected" };
      }
      if (row.unit_id && !units.some((u) => u.id === row.unit_id)) {
        return { row, action: "skip", reason: `Unknown unit_id ${row.unit_id}` };
      }
      if (row.id) {
        const found = lessons.find((l) => l.id === row.id);
        if (!found) return { row, action: "skip", reason: `No lesson with id ${row.id}` };
        return { row, unitId, action: "update", existingId: found.id };
      }
      const match =
        row.order_index !== undefined
          ? lessons.find((l) => l.unit_id === unitId && l.order_index === row.order_index)
          : undefined;
      return match
        ? { row, unitId, action: "update", existingId: match.id }
        : { row, unitId, action: "create" };
    });

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const { rows, errors: parseErrors } = parseLessonsCsv(text);
    setErrors(parseErrors);
    setPlanned(buildPlan(rows, fallbackUnit));
  };

  const onFallbackUnitChange = (value: string) => {
    setFallbackUnit(value);
    setPlanned((prev) => buildPlan(prev.map((p) => p.row), value));
  };

  const runImport = async () => {
    const items = planned.filter((p) => p.action !== "skip");
    if (!items.length) {
      toast.error("Nothing to import");
      return;
    }
    setIsImporting(true);
    let created = 0;
    let updated = 0;
    const failures: string[] = [];

    for (const item of items) {
      const { row, unitId } = item;
      const existing = item.existingId ? lessons.find((l) => l.id === item.existingId) : undefined;
      const media_settings = mergeCsvMediaSettings(existing?.media_settings, row);

      const payload: Record<string, unknown> = {
        title: row.title,
        unit_id: unitId,
        order_index: row.order_index ?? existing?.order_index ?? 0,
        media_settings,
      };
      if (row.arabic_text !== undefined) payload.arabic_text = row.arabic_text;
      if (row.transliteration !== undefined) payload.transliteration = row.transliteration;
      if (row.image_url !== undefined) payload.image_url = row.image_url;
      if (row.audio_url !== undefined) payload.audio_url = row.audio_url;

      try {
        if (item.action === "update" && item.existingId) {
          const { error } = await supabase.from("lessons").update(payload as any).eq("id", item.existingId);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase.from("lessons").insert(payload as any);
          if (error) throw error;
          created++;
        }
      } catch (err) {
        failures.push(`${row.title}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ["lessons"] });

    if (failures.length) {
      toast.warning(`Imported ${created + updated} lessons, ${failures.length} failed`);
      setErrors(failures);
    } else {
      toast.success(`Imported successfully — ${created} created, ${updated} updated`);
      onOpenChange(false);
      setPlanned([]);
      setFileName("");
      setErrors([]);
    }
  };

  const counts = {
    create: planned.filter((p) => p.action === "create").length,
    update: planned.filter((p) => p.action === "update").length,
    skip: planned.filter((p) => p.action === "skip").length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk import lessons from CSV</DialogTitle>
          <DialogDescription>
            Create or update many lessons at once, including text, media URLs and AI prompts.
            Columns: {LESSON_CSV_COLUMNS.join(", ")}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => download("lessons-template.csv", LESSON_CSV_TEMPLATE)}
            >
              <Download className="h-4 w-4" />
              Download template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => download("lessons-export.csv", lessonsToCsv(lessons))}
            >
              <Download className="h-4 w-4" />
              Export current lessons
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fallback unit (used when a row has no unit_id)</Label>
              <Select value={fallbackUnit} onValueChange={onFallbackUnitChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CSV file</Label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm"
              />
              {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
            </div>
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  {errors.slice(0, 12).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {planned.length > 0 && (
            <>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">{counts.create} to create</Badge>
                <Badge variant="secondary">{counts.update} to update</Badge>
                {counts.skip > 0 && <Badge variant="destructive">{counts.skip} skipped</Badge>}
              </div>
              <ScrollArea className="max-h-64 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Action</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-20">Order</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planned.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant={p.action === "skip" ? "destructive" : "outline"}>
                            {p.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{p.row.title}</TableCell>
                        <TableCell className="text-sm">{p.row.order_index ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.reason ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={runImport}
            disabled={isImporting || counts.create + counts.update === 0}
            className="gap-2"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import {counts.create + counts.update} lessons
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
