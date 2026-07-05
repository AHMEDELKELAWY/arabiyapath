import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Example {
  arabic: string;
  english: string;
  note?: string;
}

interface Props {
  unitId: string;
}

/**
 * Admin editor for a unit's optional Grammar lesson.
 * Upserts a single row in `flashcard_unit_grammar` keyed by unit_id.
 */
export function AdminGrammarEditor({ unitId }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [examples, setExamples] = useState<Example[]>([]);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fc-grammar", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_unit_grammar")
        .select("id,title,explanation,examples")
        .eq("unit_id", unitId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setRowId(data.id);
      setTitle(data.title ?? "");
      setExplanation(data.explanation ?? "");
      setExamples(Array.isArray(data.examples) ? (data.examples as Example[]) : []);
    } else {
      setRowId(null);
      setTitle("");
      setExplanation("");
      setExamples([]);
    }
  }, [data]);

  const updateExample = (i: number, patch: Partial<Example>) => {
    setExamples((arr) => arr.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  };
  const addExample = () =>
    setExamples((arr) => [...arr, { arabic: "", english: "", note: "" }]);
  const removeExample = (i: number) =>
    setExamples((arr) => arr.filter((_, idx) => idx !== i));
  const moveExample = (i: number, dir: -1 | 1) => {
    setExamples((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = arr.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const cleanExamples = examples
        .map((ex) => ({
          arabic: (ex.arabic ?? "").trim(),
          english: (ex.english ?? "").trim(),
          note: (ex.note ?? "").trim() || undefined,
        }))
        .filter((ex) => ex.arabic || ex.english);

      const payload = {
        unit_id: unitId,
        title: title.trim() || null,
        explanation: explanation.trim() || null,
        examples: cleanExamples,
      };

      const { error } = await (supabase as any)
        .from("flashcard_unit_grammar")
        .upsert(payload, { onConflict: "unit_id" });

      if (error) throw error;
      toast({ title: "Grammar saved" });
      qc.invalidateQueries({ queryKey: ["admin-fc-grammar", unitId] });
      qc.invalidateQueries({ queryKey: ["fc-unit-grammar", unitId] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!rowId) return;
    if (!confirm("Delete this grammar lesson?")) return;
    const { error } = await (supabase as any)
      .from("flashcard_unit_grammar")
      .delete()
      .eq("id", rowId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Grammar deleted" });
    qc.invalidateQueries({ queryKey: ["admin-fc-grammar", unitId] });
    qc.invalidateQueries({ queryKey: ["fc-unit-grammar", unitId] });
  };

  return (
    <Card className="mt-4 border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">Grammar Lesson</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <Input
              placeholder="Title (e.g. Definite article ال)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Explanation (short paragraph in English)"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={5}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Examples</span>
                <Button size="sm" variant="outline" onClick={addExample} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add example
                </Button>
              </div>

              {examples.length === 0 && (
                <p className="text-xs text-muted-foreground">No examples yet.</p>
              )}

              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border/60 p-3 space-y-2 bg-muted/30"
                >
                  <Input
                    placeholder="Arabic (with tashkeel)"
                    dir="rtl"
                    lang="ar"
                    value={ex.arabic}
                    onChange={(e) => updateExample(i, { arabic: e.target.value })}
                  />
                  <Input
                    placeholder="English translation"
                    value={ex.english}
                    onChange={(e) => updateExample(i, { english: e.target.value })}
                  />
                  <Input
                    placeholder="Optional note"
                    value={ex.note ?? ""}
                    onChange={(e) => updateExample(i, { note: e.target.value })}
                  />
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveExample(i, -1)}
                      disabled={i === 0}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveExample(i, 1)}
                      disabled={i === examples.length - 1}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeExample(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Grammar"}
              </Button>
              {rowId && (
                <Button variant="outline" onClick={remove}>
                  Delete Grammar
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
