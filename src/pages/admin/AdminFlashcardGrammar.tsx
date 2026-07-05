import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Search, Download, Upload,
  Eye, EyeOff, ChevronDown, CheckCircle2, Circle, FileJson,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Example {
  arabic: string;
  english: string;
  note?: string;
}

interface UnitRow {
  id: string;
  slug: string;
  title_en: string;
  order_index: number;
  has_grammar: boolean;
  published: boolean;
}

interface GrammarRow {
  id: string;
  unit_id: string;
  title: string | null;
  explanation: string | null;
  examples: Example[] | null;
}

export default function AdminFlashcardGrammar() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const unitId = params.get("unit") || "";
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [examples, setExamples] = useState<Example[]>([]);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data: units } = useQuery({
    queryKey: ["admin-fc-units-grammar"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,order_index,has_grammar,published")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as UnitRow[];
    },
  });

  const { data: grammarRows } = useQuery({
    queryKey: ["admin-fc-grammar-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_unit_grammar")
        .select("id,unit_id,title,explanation,examples");
      if (error) throw error;
      return (data ?? []) as GrammarRow[];
    },
  });

  const grammarByUnit = useMemo(() => {
    const map = new Map<string, GrammarRow>();
    (grammarRows ?? []).forEach((g) => map.set(g.unit_id, g));
    return map;
  }, [grammarRows]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units ?? [];
    return (units ?? []).filter(
      (u) =>
        u.title_en.toLowerCase().includes(q) ||
        u.slug.toLowerCase().includes(q),
    );
  }, [units, search]);

  const selectedUnit = useMemo(
    () => (units ?? []).find((u) => u.id === unitId),
    [units, unitId],
  );

  const setUnit = (id: string) => {
    const p = new URLSearchParams(params);
    if (id) p.set("unit", id);
    else p.delete("unit");
    setParams(p, { replace: true });
  };

  // Load selected grammar into local editor state.
  useEffect(() => {
    const g = unitId ? grammarByUnit.get(unitId) : undefined;
    if (g) {
      setRowId(g.id);
      setTitle(g.title ?? "");
      setExplanation(g.explanation ?? "");
      setExamples(Array.isArray(g.examples) ? g.examples : []);
    } else {
      setRowId(null);
      setTitle("");
      setExplanation("");
      setExamples([]);
    }
    setDirty(false);
  }, [unitId, grammarByUnit]);

  const markDirty = () => setDirty(true);

  const updateExample = (i: number, patch: Partial<Example>) => {
    setExamples((arr) => arr.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
    markDirty();
  };
  const addExample = () => {
    setExamples((arr) => [...arr, { arabic: "", english: "", note: "" }]);
    markDirty();
  };
  const removeExample = (i: number) => {
    setExamples((arr) => arr.filter((_, idx) => idx !== i));
    markDirty();
  };
  const moveExample = (i: number, dir: -1 | 1) => {
    setExamples((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = arr.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    markDirty();
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-fc-grammar-all"] });
    qc.invalidateQueries({ queryKey: ["admin-fc-units-grammar"] });
    qc.invalidateQueries({ queryKey: ["admin-fc-grammar", unitId] });
    qc.invalidateQueries({ queryKey: ["fc-unit-grammar", unitId] });
  };

  const createEmpty = async () => {
    if (!unitId) return;
    const { error } = await (supabase as any)
      .from("flashcard_unit_grammar")
      .insert({ unit_id: unitId, title: "", explanation: "", examples: [] });
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    toast({ title: "Grammar lesson created" });
    invalidate();
  };

  const save = async () => {
    if (!unitId) return;
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
      setDirty(false);
      invalidate();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!rowId) return;
    if (!confirm("Delete this grammar lesson? This cannot be undone.")) return;
    const { error } = await (supabase as any)
      .from("flashcard_unit_grammar")
      .delete()
      .eq("id", rowId);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Grammar deleted" });
    invalidate();
  };

  // "Publish" is expressed through the parent unit's has_grammar toggle,
  // which is what actually gates public visibility of the Grammar tab.
  const togglePublish = async (next: boolean) => {
    if (!unitId) return;
    const { error } = await (supabase as any)
      .from("flashcard_units")
      .update({ has_grammar: next })
      .eq("id", unitId);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: next ? "Grammar tab enabled" : "Grammar tab hidden" });
    invalidate();
  };

  const exportJson = () => {
    if (!selectedUnit) return;
    const payload = {
      unit_slug: selectedUnit.slug,
      unit_title: selectedUnit.title_en,
      title,
      explanation,
      examples,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grammar-${selectedUnit.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed.title !== undefined) setTitle(String(parsed.title ?? ""));
      if (parsed.explanation !== undefined) setExplanation(String(parsed.explanation ?? ""));
      if (Array.isArray(parsed.examples)) {
        setExamples(
          parsed.examples.map((ex: any) => ({
            arabic: String(ex.arabic ?? ""),
            english: String(ex.english ?? ""),
            note: ex.note ? String(ex.note) : undefined,
          })),
        );
      }
      setDirty(true);
      toast({ title: "Imported — remember to Save" });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  };

  const totalWithGrammar = grammarRows?.length ?? 0;
  const totalPublished = (units ?? []).filter((u) => u.has_grammar && grammarByUnit.has(u.id)).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Grammar Content</h1>
          <p className="text-sm text-muted-foreground">
            Manage the optional Grammar lesson for each vocabulary unit.
          </p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{totalWithGrammar}</strong> lessons</span>
          <span><strong className="text-foreground">{totalPublished}</strong> visible</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Unit list */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Units</CardTitle>
            <div className="relative mt-2">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                className="pl-7 h-8"
                placeholder="Search units…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 max-h-[70vh] overflow-auto">
            {filteredUnits.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No units match.</p>
            )}
            {filteredUnits.map((u) => {
              const g = grammarByUnit.get(u.id);
              const isSelected = u.id === unitId;
              const isPublished = u.has_grammar && !!g;
              return (
                <button
                  key={u.id}
                  onClick={() => setUnit(u.id)}
                  className={`w-full text-left rounded-md p-2 text-sm hover:bg-accent transition-colors ${
                    isSelected ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {g ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{u.title_en}</span>
                    {isPublished ? (
                      <Badge variant="secondary" className="h-4 text-[10px] px-1">Live</Badge>
                    ) : g ? (
                      <Badge variant="outline" className="h-4 text-[10px] px-1">Draft</Badge>
                    ) : null}
                  </div>
                  <span className="block text-[11px] text-muted-foreground truncate pl-5">
                    /{u.slug}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Editor */}
        <div>
          {!unitId ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Select a unit from the left to edit its Grammar lesson.
              </CardContent>
            </Card>
          ) : !selectedUnit ? (
            <Card><CardContent className="p-6 text-sm">Loading unit…</CardContent></Card>
          ) : !rowId ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selectedUnit.title_en}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No grammar lesson exists for this unit yet.
                </p>
                <Button onClick={createEmpty} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Grammar Lesson
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{selectedUnit.title_en}</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">/{selectedUnit.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedUnit.has_grammar ? (
                    <Button size="sm" variant="outline" onClick={() => togglePublish(false)} className="gap-1">
                      <EyeOff className="w-3.5 h-3.5" /> Unpublish
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => togglePublish(true)} className="gap-1">
                      <Eye className="w-3.5 h-3.5" /> Publish
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1">
                        Actions <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={exportJson}>
                        <Download className="w-3.5 h-3.5 mr-2" /> Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5 mr-2" /> Import JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={remove} className="text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete lesson
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImport(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedUnit.has_grammar && (
                  <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                    This unit's Grammar tab is currently hidden from students. Click Publish to show it.
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium mb-1 block">Title</label>
                  <Input
                    placeholder="e.g. Definite article ال"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Explanation</label>
                  <Textarea
                    placeholder="Short paragraph in English"
                    value={explanation}
                    onChange={(e) => { setExplanation(e.target.value); markDirty(); }}
                    rows={6}
                  />
                </div>

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
                        <Button size="sm" variant="ghost" onClick={() => moveExample(i, -1)} disabled={i === 0}>
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => moveExample(i, 1)} disabled={i === examples.length - 1}>
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeExample(i)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <Button onClick={save} disabled={saving || !dirty}>
                    {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                  </Button>
                  {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
