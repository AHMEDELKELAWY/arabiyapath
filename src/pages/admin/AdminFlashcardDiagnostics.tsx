import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, Layers, Image as ImageIcon, Volume2, AlertCircle,
  Wrench, ShieldCheck, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  runRepair, runIntegrityScan,
  type RepairSummary, type IntegrityReport,
} from "@/lib/flashcards/repairImages";
import { resetVerbsImages, type VerbsResetReport } from "@/lib/flashcards/migrateVerbs";

async function countCards(filter?: (q: any) => any) {
  let q = (supabase as any).from("flashcards").select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export default function AdminFlashcardDiagnostics() {
  const metrics = useQuery({
    queryKey: ["admin-fc-diagnostics"],
    queryFn: async () => {
      const [
        units, cards, images, audio, missingImages, missingAudio, missingThumbs,
      ] = await Promise.all([
        (async () => {
          const { count, error } = await (supabase as any)
            .from("flashcard_units").select("id", { count: "exact", head: true });
          if (error) throw error;
          return count ?? 0;
        })(),
        countCards(),
        countCards((q) => q.not("image_url", "is", null)),
        countCards((q) => q.not("audio_url", "is", null)),
        countCards((q) => q.is("image_url", null)),
        countCards((q) => q.is("audio_url", null)),
        countCards((q) => q.not("image_url", "is", null).is("thumbnail_url", null)),
      ]);
      return { units, cards, images, audio, missingImages, missingAudio, missingThumbs };
    },
  });

  const largest = useQuery({
    queryKey: ["admin-fc-largest-images"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("id,arabic_text,english_translation,image_width,image_height,image_size_kb,thumbnail_url,image_url")
        .not("image_size_kb", "is", null)
        .order("image_size_kb", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [repairing, setRepairing] = useState(false);
  const [repairPhase, setRepairPhase] = useState<string>("");
  const [repairProgress, setRepairProgress] = useState({ done: 0, total: 0 });
  const [repairSummary, setRepairSummary] = useState<RepairSummary | null>(null);

  const [scanning, setScanning] = useState(false);
  const [verifyUrls, setVerifyUrls] = useState(false);
  const [scan, setScan] = useState<IntegrityReport | null>(null);

  const [verbsBusy, setVerbsBusy] = useState(false);
  const [verbsProgress, setVerbsProgress] = useState({ done: 0, total: 0 });
  const [verbsReport, setVerbsReport] = useState<VerbsResetReport | null>(null);

  const onResetVerbs = async () => {
    if (!confirm(
      "Clear ALL image fields on every Verbs card (both Learn and Speaking)?\n\n" +
      "This wipes image_url, thumbnail_url, and image metadata so you can re-upload " +
      "fresh per-kind image sets via Bulk Upload. Card text, audio, and order are not touched."
    )) return;
    setVerbsBusy(true);
    setVerbsReport(null);
    setVerbsProgress({ done: 0, total: 0 });
    try {
      const r = await resetVerbsImages((done, total) => setVerbsProgress({ done, total }));
      setVerbsReport(r);
      toast({ title: "Verbs images cleared", description: `Cleared ${r.cleared} · Failed ${r.failed}` });
      refresh();
    } catch (e: any) {
      toast({ title: "Verbs reset failed", description: e.message, variant: "destructive" });
    } finally {
      setVerbsBusy(false);
    }
  };

  const refresh = () => {
    metrics.refetch();
    largest.refetch();
  };

  const onRepair = async () => {
    if (!confirm("Repair flashcard images now? This regenerates missing thumbnails and tries to recover missing originals from Storage.")) return;
    setRepairing(true);
    setRepairSummary(null);
    setRepairPhase("Starting…");
    setRepairProgress({ done: 0, total: 0 });
    try {
      const summary = await runRepair((phase, done, total) => {
        setRepairPhase(phase === "thumbnails" ? "Rebuilding thumbnails" : "Recovering originals");
        setRepairProgress({ done, total });
      });
      setRepairSummary(summary);
      toast({
        title: "Repair complete",
        description: `Thumbnails repaired: ${summary.thumbnailsRepaired} · Originals recovered: ${summary.originalsRecovered} · Manual: ${summary.originalsManual}`,
      });
      refresh();
    } catch (e: any) {
      toast({ title: "Repair failed", description: e.message, variant: "destructive" });
    } finally {
      setRepairing(false);
    }
  };

  const onScan = async () => {
    setScanning(true);
    setScan(null);
    try {
      const report = await runIntegrityScan({ verifyUrls });
      setScan(report);
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const m = metrics.data;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Vocabulary Diagnostics</h1>
        <Button variant="outline" size="sm" onClick={refresh} disabled={metrics.isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${metrics.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Metric icon={<Layers className="w-4 h-4" />} label="Total Units" value={m?.units ?? "—"} />
        <Metric icon={<Layers className="w-4 h-4" />} label="Total Cards" value={m?.cards ?? "—"} />
        <Metric icon={<ImageIcon className="w-4 h-4" />} label="With Image" value={m?.images ?? "—"} />
        <Metric icon={<Volume2 className="w-4 h-4" />} label="With Audio" value={m?.audio ?? "—"} />
        <Metric icon={<AlertCircle className="w-4 h-4 text-amber-500" />} label="Missing Image" value={m?.missingImages ?? "—"} />
        <Metric icon={<AlertCircle className="w-4 h-4 text-amber-500" />} label="Missing Audio" value={m?.missingAudio ?? "—"} />
        <Metric icon={<AlertCircle className="w-4 h-4 text-amber-500" />} label="Missing Thumbnail" value={m?.missingThumbs ?? "—"} />
      </div>

      {/* Repair Tool */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Repair Vocabulary Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Step A regenerates missing thumbnails and dimensions from the existing original.
            Step B searches Storage for files whose filename ends in the card's order number
            and restores <code>image_url</code> automatically. Cards that cannot be recovered
            are reported for manual upload.
          </p>
          <Button onClick={onRepair} disabled={repairing}>
            {repairing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
            {repairing ? "Repairing…" : "Run Repair"}
          </Button>
          {repairing && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{repairPhase} — {repairProgress.done} / {repairProgress.total}</p>
              <Progress value={repairProgress.total ? (repairProgress.done / repairProgress.total) * 100 : 0} />
            </div>
          )}
          {repairSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              <Badge variant="default" className="justify-between">Thumbnails repaired<span>{repairSummary.thumbnailsRepaired}</span></Badge>
              <Badge variant="destructive" className="justify-between">Thumbnails failed<span>{repairSummary.thumbnailsFailed}</span></Badge>
              <Badge variant="default" className="justify-between">Originals recovered<span>{repairSummary.originalsRecovered}</span></Badge>
              <Badge variant="secondary" className="justify-between">Manual upload required<span>{repairSummary.originalsManual}</span></Badge>
            </div>
          )}
          {repairSummary && repairSummary.details.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Details ({repairSummary.details.length})</summary>
              <div className="border rounded-md mt-2 max-h-72 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr><th className="text-left p-2">Unit</th><th className="p-2 text-left">Card</th><th className="p-2 text-left">Kind</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Notes</th></tr>
                  </thead>
                  <tbody>
                    {repairSummary.details.map((d) => (
                      <tr key={d.cardId + d.status} className="border-t">
                        <td className="p-2">{d.unitSlug}</td>
                        <td className="p-2">#{d.order_index}</td>
                        <td className="p-2">{d.kind}</td>
                        <td className="p-2">{d.status}</td>
                        <td className="p-2 text-muted-foreground">{d.message ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Verbs Image Reset (clean rebuild) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Reset Verbs Images (Clean Rebuild)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Clears <code>image_url</code>, <code>thumbnail_url</code>, and image
            metadata for every Verbs card — both Learn and Speaking. After
            running this, re-upload the original Verbs images via{" "}
            <strong>Bulk Image Upload</strong> on each tab separately. Learn
            and Speaking each get their own kind-specific image set under{" "}
            <code>content/flashcards/images/verbs/&lt;kind&gt;/</code>.
            Card text, audio, order, and learner progress are not touched.
          </p>
          <Button onClick={onResetVerbs} disabled={verbsBusy} variant="destructive">
            {verbsBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
            {verbsBusy ? "Clearing…" : "Reset Verbs Images"}
          </Button>
          {verbsBusy && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {verbsProgress.done} / {verbsProgress.total}
              </p>
              <Progress value={verbsProgress.total ? (verbsProgress.done / verbsProgress.total) * 100 : 0} />
            </div>
          )}
          {verbsReport && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                <Badge variant="default" className="justify-between">Total cards<span>{verbsReport.totalCards}</span></Badge>
                <Badge variant="default" className="justify-between">Cleared<span>{verbsReport.cleared}</span></Badge>
                <Badge variant="secondary" className="justify-between">Learn cleared<span>{verbsReport.byKind.learn}</span></Badge>
                <Badge variant="secondary" className="justify-between">Speaking cleared<span>{verbsReport.byKind.speaking}</span></Badge>
                <Badge variant="destructive" className="justify-between">Failed<span>{verbsReport.failed}</span></Badge>
              </div>
              {verbsReport.failed > 0 && (
                <details className="text-xs" open>
                  <summary className="cursor-pointer font-medium">Failures</summary>
                  <ul className="mt-1 pl-4 list-disc text-destructive">
                    {verbsReport.items.filter((it) => it.status === "failed").map((it) => (
                      <li key={it.cardId}>#{it.order_index} ({it.kind}): {it.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Integrity Scan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Integrity Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox id="verifyUrls" checked={verifyUrls} onCheckedChange={(v) => setVerifyUrls(!!v)} />
            <label htmlFor="verifyUrls" className="text-xs">Verify every storage URL (slower — sends HEAD requests)</label>
          </div>
          <Button onClick={onScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            {scanning ? "Scanning…" : "Run Scan"}
          </Button>
          {scan && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Badge variant="default" className="justify-between">Total<span>{scan.total}</span></Badge>
                <Badge variant="default" className="justify-between">Healthy<span>{scan.healthy}</span></Badge>
                <Badge variant="secondary" className="justify-between">Missing originals<span>{scan.missingOriginals}</span></Badge>
                <Badge variant="secondary" className="justify-between">Missing thumbnails<span>{scan.missingThumbnails}</span></Badge>
                <Badge variant="secondary" className="justify-between">Missing metadata<span>{scan.missingMetadata}</span></Badge>
                {verifyUrls && <Badge variant="destructive" className="justify-between">Broken originals<span>{scan.brokenOriginalUrls}</span></Badge>}
                {verifyUrls && <Badge variant="destructive" className="justify-between">Broken thumbnails<span>{scan.brokenThumbnailUrls}</span></Badge>}
              </div>

              <details>
                <summary className="cursor-pointer font-medium">Per-unit breakdown</summary>
                <div className="border rounded-md mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Unit</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">Healthy</th>
                        <th className="text-right p-2">Missing orig.</th>
                        <th className="text-right p-2">Missing thumb</th>
                        <th className="text-right p-2">Missing meta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scan.perUnit.map((u) => (
                        <tr key={u.unitId} className="border-t">
                          <td className="p-2">{u.title ?? u.slug ?? u.unitId}</td>
                          <td className="p-2 text-right">{u.total}</td>
                          <td className="p-2 text-right">{u.healthy}</td>
                          <td className="p-2 text-right">{u.missingOriginals}</td>
                          <td className="p-2 text-right">{u.missingThumbnails}</td>
                          <td className="p-2 text-right">{u.missingMetadata}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              {scan.problems.length > 0 && (
                <details open>
                  <summary className="cursor-pointer font-medium">Problem cards ({scan.problems.length})</summary>
                  <div className="border rounded-md mt-2 max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr><th className="text-left p-2">Unit</th><th className="text-left p-2">Card</th><th className="text-left p-2">Kind</th><th className="text-left p-2">English</th><th className="text-left p-2">Issue</th></tr>
                      </thead>
                      <tbody>
                        {scan.problems.map((p, i) => (
                          <tr key={p.cardId + i} className="border-t">
                            <td className="p-2">{p.unitSlug}</td>
                            <td className="p-2">#{p.order_index}</td>
                            <td className="p-2">{p.kind}</td>
                            <td className="p-2">{p.english}</td>
                            <td className="p-2 text-destructive">{p.issue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Largest Images</CardTitle>
        </CardHeader>
        <CardContent>
          {largest.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !largest.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No image-size metadata yet. Newly uploaded images will appear here.
            </p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2"></th>
                    <th className="text-left p-2">Card</th>
                    <th className="text-right p-2">Width</th>
                    <th className="text-right p-2">Height</th>
                    <th className="text-right p-2">Size (KB)</th>
                  </tr>
                </thead>
                <tbody>
                  {largest.data.map((c: any) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2 w-16">
                        {(c.thumbnail_url || c.image_url) && (
                          <img
                            src={c.thumbnail_url || c.image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-9 object-cover rounded"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-medium" dir="rtl">{c.arabic_text}</div>
                        <div className="text-xs text-muted-foreground">{c.english_translation}</div>
                      </td>
                      <td className="p-2 text-right">{c.image_width ?? "—"}</td>
                      <td className="p-2 text-right">{c.image_height ?? "—"}</td>
                      <td className="p-2 text-right font-mono">{c.image_size_kb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
