import { useState, useCallback, useMemo, useEffect } from "react";
import JSZip from "jszip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileArchive, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  isImageFilename,
  matchFilesToCards,
  type MatcherCard,
  type MatcherFile,
  type Match,
} from "@/lib/flashcards/bulkImageMatcher";
import { uploadAndWriteCardImage } from "@/lib/flashcards/imageWrite";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unitId: string;
  unitSlug: string;
  kind: "learn" | "speaking";
  onComplete?: () => void;
}

type Stage = "loading" | "select" | "preview" | "uploading" | "results";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per image
const UPLOAD_CONCURRENCY = 6;

interface UploadResult {
  cardId: string;
  filename: string;
  status: "ok" | "failed";
  overwrote: boolean;
  error?: string;
}

export function BulkImageUploadDialog({
  open,
  onOpenChange,
  unitId,
  unitSlug,
  kind,
  onComplete,
}: Props) {
  const [stage, setStage] = useState<Stage>("loading");
  const [parsing, setParsing] = useState(false);
  const [allCards, setAllCards] = useState<MatcherCard[]>([]);
  const [files, setFiles] = useState<MatcherFile[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<UploadResult[]>([]);

  // Always fetch the FULL filtered unit when the dialog opens — never rely on
  // the currently paginated page. This guarantees every card in the unit is
  // considered when matching filenames.
  useEffect(() => {
    if (!open || !unitId) return;
    let cancelled = false;
    setStage("loading");
    setFiles([]);
    setResults([]);
    setProgress({ done: 0, total: 0 });
    (async () => {
      const PAGE = 1000;
      const all: any[] = [];
      try {
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await (supabase as any)
            .from("flashcards")
            .select("id,order_index,arabic_text,english_translation,image_url,thumbnail_url")
            .eq("unit_id", unitId)
            .eq("kind", kind)
            .order("order_index")
            .range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data?.length) break;
          all.push(...data);
          if (data.length < PAGE) break;
        }
        if (cancelled) return;
        setAllCards(all as MatcherCard[]);
        setStage("select");
      } catch (e: any) {
        toast({ title: "Could not load cards", description: e.message, variant: "destructive" });
      }
    })();
    return () => { cancelled = true; };
  }, [open, unitId, kind]);

  const match = useMemo(
    () => (files.length && allCards.length ? matchFilesToCards(files, allCards, "order") : null),
    [files, allCards],
  );

  const reset = () => {
    setStage(allCards.length ? "select" : "loading");
    setFiles([]);
    setProgress({ done: 0, total: 0 });
    setResults([]);
    setParsing(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      if (stage === "results") onComplete?.();
      reset();
    }
    onOpenChange(v);
  };

  const ingestFileList = useCallback(async (list: FileList | File[]) => {
    setParsing(true);
    try {
      const arr = Array.from(list);
      const out: MatcherFile[] = [];
      for (const f of arr) {
        if (f.name.toLowerCase().endsWith(".zip")) {
          const zip = await JSZip.loadAsync(f);
          for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            const base = path.split("/").pop()!;
            if (base.startsWith(".") || base.startsWith("__MACOSX")) continue;
            if (!isImageFilename(base)) continue;
            const blob = await entry.async("blob");
            if (blob.size > MAX_FILE_BYTES) continue;
            out.push({ name: base, size: blob.size, blob });
          }
        } else if (isImageFilename(f.name)) {
          if (f.size > MAX_FILE_BYTES) continue;
          out.push({ name: f.name, size: f.size, blob: f });
        }
      }
      if (!out.length) {
        toast({ title: "No valid images found", variant: "destructive" });
        setParsing(false);
        return;
      }
      setFiles(out);
      setStage("preview");
    } catch (e: any) {
      toast({ title: "Failed to read files", description: e.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) ingestFileList(e.dataTransfer.files);
  };

  const runUploads = async () => {
    if (!match) return;
    if (!unitSlug) {
      return toast({ title: "Unit has no slug — set one before uploading.", variant: "destructive" });
    }
    setStage("uploading");
    setProgress({ done: 0, total: match.matches.length });
    const out: UploadResult[] = [];

    let cursor = 0;
    const matches = match.matches;

    const worker = async () => {
      while (cursor < matches.length) {
        const i = cursor++;
        const m: Match = matches[i];
        try {
          await uploadAndWriteCardImage({
            cardId: m.card.id,
            unitSlug,
            kind,
            orderIndex: m.card.order_index,
            source: m.file.blob,
          });
          out.push({ cardId: m.card.id, filename: m.file.name, status: "ok", overwrote: m.overwrites });
        } catch (e: any) {
          out.push({ cardId: m.card.id, filename: m.file.name, status: "failed", overwrote: m.overwrites, error: e.message });
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    };

    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
    setResults(out);
    setStage("results");
  };

  const okCount = results.filter((r) => r.status === "ok").length;
  const failCount = results.filter((r) => r.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Image Upload</DialogTitle>
          <DialogDescription>
            Operates on every {kind === "learn" ? "Learn" : "Speaking"} card in this unit
            ({allCards.length} total). Files match by the last number in the filename
            (e.g. <code>msa-u01-001.jpg</code> → card #1).
          </DialogDescription>
        </DialogHeader>

        {stage === "loading" && (
          <div className="flex items-center justify-center py-10 gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading every card in this unit…
          </div>
        )}

        {stage === "select" && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = ".zip,image/jpeg,image/png,image/webp";
              input.onchange = (e) => {
                const fl = (e.target as HTMLInputElement).files;
                if (fl) ingestFileList(fl);
              };
              input.click();
            }}
          >
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Reading files…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileArchive className="w-10 h-10 text-muted-foreground" />
                <p className="font-medium">Drop ZIP or images here, or click to select</p>
                <p className="text-xs text-muted-foreground">
                  .zip, .jpg, .jpeg, .png, .webp · up to 10 MB per image
                </p>
              </div>
            )}
          </div>
        )}

        {stage === "preview" && match && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">Matched: {match.matches.length}</Badge>
              <Badge variant="secondary">
                Will Replace Existing Images: {match.matches.filter((m) => m.overwrites).length}
              </Badge>
              <Badge variant="secondary">Unmatched Files: {match.unmatchedFiles.length}</Badge>
              <Badge variant="outline">Cards without a file in this run: {allCards.length - match.matches.length}</Badge>
            </div>

            <div className="border rounded-md max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Card</th>
                    <th className="text-left p-2">Arabic</th>
                    <th className="text-left p-2">File</th>
                    <th className="text-left p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {match.matches.map((m) => (
                    <tr key={m.card.id} className="border-t">
                      <td className="p-2">#{m.card.order_index}</td>
                      <td className="p-2" dir="rtl">{m.card.arabic_text}</td>
                      <td className="p-2 font-mono text-xs">{m.file.name}</td>
                      <td className="p-2">
                        {m.overwrites ? (
                          <Badge variant="secondary" className="text-xs">
                            Will Replace Existing Image
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">new</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {match.unmatchedFiles.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Unmatched Files ({match.unmatchedFiles.length})
                </summary>
                <ul className="mt-1 pl-4 list-disc text-muted-foreground font-mono text-xs">
                  {match.unmatchedFiles.map((f) => <li key={f.name}>{f.name}</li>)}
                </ul>
              </details>
            )}

            {match.missingCards.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Cards still missing images ({match.missingCards.length})
                </summary>
                <ul className="mt-1 pl-4 list-disc text-muted-foreground text-xs">
                  {match.missingCards.map((c) => (
                    <li key={c.id}>#{c.order_index} — {c.english_translation}</li>
                  ))}
                </ul>
              </details>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={runUploads} disabled={!match.matches.length}>
                Confirm Upload ({match.matches.length})
              </Button>
            </DialogFooter>
          </div>
        )}

        {stage === "uploading" && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Uploading {progress.done} of {progress.total}…
            </p>
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
          </div>
        )}

        {stage === "results" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <Badge variant="default" className="justify-between gap-2">
                <span>Matched</span><span>{match?.matches.length ?? 0}</span>
              </Badge>
              <Badge variant="default" className="justify-between gap-2">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified</span><span>{okCount}</span>
              </Badge>
              <Badge variant="secondary" className="justify-between gap-2">
                <span>Replaced Existing Images</span>
                <span>{results.filter((r) => r.status === "ok" && r.overwrote).length}</span>
              </Badge>
              <Badge variant="outline" className="justify-between gap-2">
                <span>Cards without a file</span>
                <span>{Math.max(0, allCards.length - (match?.matches.length ?? 0))}</span>
              </Badge>
              <Badge variant="secondary" className="justify-between gap-2">
                <span>Unmatched Files</span><span>{match?.unmatchedFiles.length ?? 0}</span>
              </Badge>
              {failCount > 0 && (
                <Badge variant="destructive" className="justify-between gap-2">
                  <AlertCircle className="w-3 h-3" />
                  <span>Failed</span><span>{failCount}</span>
                </Badge>
              )}
            </div>

            {failCount > 0 && (
              <details className="text-sm" open>
                <summary className="cursor-pointer font-medium">Failures</summary>
                <ul className="mt-1 pl-4 list-disc text-destructive text-xs">
                  {results.filter((r) => r.status === "failed").map((r) => (
                    <li key={r.cardId}>{r.filename}: {r.error}</li>
                  ))}
                </ul>
              </details>
            )}

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Close</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
