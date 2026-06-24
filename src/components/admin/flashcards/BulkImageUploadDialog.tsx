import { useState, useCallback, useMemo } from "react";
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
import { Upload, Loader2, FileArchive, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  isImageFilename,
  matchFilesToCards,
  type MatcherCard,
  type MatcherFile,
  type Match,
} from "@/lib/flashcards/bulkImageMatcher";
import { compressFlashcardImage } from "@/lib/flashcards/imageCompress";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unitId: string;
  unitSlug: string;
  cards: MatcherCard[];
  onComplete?: () => void;
}

type Stage = "select" | "preview" | "uploading" | "results";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per image
const UPLOAD_CONCURRENCY = 10;
const BUCKET = "content";

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
  cards,
  onComplete,
}: Props) {
  const [stage, setStage] = useState<Stage>("select");
  const [parsing, setParsing] = useState(false);
  const [files, setFiles] = useState<MatcherFile[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<UploadResult[]>([]);

  const match = useMemo(
    () => (files.length ? matchFilesToCards(files, cards, "order") : null),
    [files, cards],
  );

  const reset = () => {
    setStage("select");
    setFiles([]);
    setProgress({ done: 0, total: 0 });
    setResults([]);
    setParsing(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      reset();
      if (stage === "results") onComplete?.();
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

  const folder = unitSlug;

  const runUploads = async () => {
    if (!match) return;
    setStage("uploading");
    setProgress({ done: 0, total: match.matches.length });
    const out: UploadResult[] = [];

    let cursor = 0;
    const matches = match.matches;

    const worker = async () => {
      while (cursor < matches.length) {
        const i = cursor++;
        const m: Match = matches[i];
        const base = m.file.name.replace(/\.[^.]+$/, "");
        const origPath = `flashcards/images/${folder}/${base}.webp`;
        const thumbPath = `flashcards/thumbnails/${folder}/${base}.webp`;
        try {
          const compressed = await compressFlashcardImage(m.file.blob);
          const [{ error: upErr }, { error: thErr }] = await Promise.all([
            supabase.storage.from(BUCKET).upload(origPath, compressed.original.blob, { upsert: true, contentType: "image/webp" }),
            supabase.storage.from(BUCKET).upload(thumbPath, compressed.thumbnail.blob, { upsert: true, contentType: "image/webp" }),
          ]);
          if (upErr) throw upErr;
          if (thErr) throw thErr;
          const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(origPath).data.publicUrl;
          const thumbUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
          const { error: updErr } = await (supabase as any)
            .from("flashcards")
            .update({
              image_url: publicUrl,
              thumbnail_url: thumbUrl,
              image_width: compressed.original.width,
              image_height: compressed.original.height,
              image_size_kb: compressed.original.sizeKb,
            })
            .eq("id", m.card.id);
          if (updErr) throw updErr;
          out.push({ cardId: m.card.id, filename: m.file.name, status: "ok", overwrote: m.overwrites });
        } catch (e: any) {
          out.push({ cardId: m.card.id, filename: m.file.name, status: "failed", overwrote: m.overwrites, error: e.message });
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
          // Yield to keep the UI responsive between batches.
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
            Upload a ZIP or multiple images. Files are matched to cards by the number in the filename
            (e.g. <code>msa-u01-001.jpg</code> → card #1).
          </DialogDescription>
        </DialogHeader>

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
              <Badge variant="outline">Missing Cards: {cards.length - match.matches.length}</Badge>
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
                <span>Updated</span><span>{okCount}</span>
              </Badge>
              <Badge variant="secondary" className="justify-between gap-2">
                <span>Replaced Existing Images</span>
                <span>{results.filter((r) => r.status === "ok" && r.overwrote).length}</span>
              </Badge>
              <Badge variant="outline" className="justify-between gap-2">
                <span>Missing Cards</span>
                <span>{Math.max(0, cards.length - (match?.matches.length ?? 0))}</span>
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
