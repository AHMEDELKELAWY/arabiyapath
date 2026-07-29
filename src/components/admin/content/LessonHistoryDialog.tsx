import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  lesson: any | null;
  onOpenChange: (open: boolean) => void;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  arabic_text: "Arabic text",
  transliteration: "Transliteration",
  image_url: "Image",
  audio_url: "Audio",
  order_index: "Order",
  unit_id: "Unit",
  media_settings: "AI settings",
};

function categoryOf(field: string) {
  if (field === "image_url") return "image";
  if (field === "audio_url") return "audio";
  if (field === "media_settings") return "settings";
  return "text";
}

function preview(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

export function LessonHistoryDialog({ lesson, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["lesson-revisions", lesson?.id],
    enabled: !!lesson?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_revisions" as any)
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <Dialog open={!!lesson} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Every change made to “{lesson?.title}” — text, image, audio and AI settings.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No changes recorded yet. New edits will appear here.
            </p>
          ) : (
            <ol className="space-y-3">
              {data.map((rev) => (
                <li key={rev.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={rev.action === "deleted" ? "destructive" : "secondary"}>
                      {rev.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(rev.created_at).toLocaleString()}
                    </span>
                    {(rev.changed_fields ?? []).map((f: string) => (
                      <Badge key={f} variant="outline" className="text-[10px]">
                        {categoryOf(f)}
                      </Badge>
                    ))}
                  </div>

                  {rev.action === "updated" ? (
                    <div className="space-y-1">
                      {(rev.changed_fields ?? []).map((f: string) => {
                        const change = rev.changes?.[f] ?? {};
                        return (
                          <div key={f} className="text-xs">
                            <span className="font-medium">{FIELD_LABELS[f] ?? f}: </span>
                            <span className="text-muted-foreground line-through">
                              {preview(change.old)}
                            </span>
                            <span className="mx-1">→</span>
                            <span>{preview(change.new)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Lesson {rev.action} — {preview(rev.lesson_title)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
