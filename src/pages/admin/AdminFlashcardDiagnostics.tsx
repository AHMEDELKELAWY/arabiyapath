import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Layers, Image as ImageIcon, Volume2, AlertCircle } from "lucide-react";

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
        units,
        cards,
        images,
        audio,
        missingImages,
        missingAudio,
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
      ]);
      return { units, cards, images, audio, missingImages, missingAudio };
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

  const refresh = () => {
    metrics.refetch();
    largest.refetch();
  };

  const m = metrics.data;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Flashcards Diagnostics</h1>
        <Button variant="outline" size="sm" onClick={refresh} disabled={metrics.isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${metrics.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Metric icon={<Layers className="w-4 h-4" />} label="Total Units" value={m?.units ?? "—"} />
        <Metric icon={<Layers className="w-4 h-4" />} label="Total Cards" value={m?.cards ?? "—"} />
        <Metric icon={<ImageIcon className="w-4 h-4" />} label="Total Images" value={m?.images ?? "—"} />
        <Metric icon={<Volume2 className="w-4 h-4" />} label="Total Audio" value={m?.audio ?? "—"} />
        <Metric icon={<AlertCircle className="w-4 h-4 text-amber-500" />} label="Missing Images" value={m?.missingImages ?? "—"} />
        <Metric icon={<AlertCircle className="w-4 h-4 text-amber-500" />} label="Missing Audio" value={m?.missingAudio ?? "—"} />
      </div>

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
