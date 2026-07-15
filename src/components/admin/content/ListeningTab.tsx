import { useEffect, useMemo, useState } from "react";
import { useQuizzes, useUnits, useLevels, useDialects } from "@/hooks/useAdminData";
import { useAdminLearnScope } from "@/components/admin/AdminScopeContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Headphones, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AudioUploader } from "../AudioUploader";

interface ListeningForm {
  prompt: string;
  correct_answer: string;
  options_json: string[];
  order_index: number;
  audio_url: string;
  quiz_id: string;
}

const EMPTY_FORM: ListeningForm = {
  prompt: "",
  correct_answer: "",
  options_json: ["", "", "", ""],
  order_index: 0,
  audio_url: "",
  quiz_id: "",
};

export function ListeningTab() {
  const scope = useAdminLearnScope();
  const { data: quizzes } = useQuizzes();
  const { data: units } = useUnits();
  const { data: levels } = useLevels();
  const { data: dialects } = useDialects();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ListeningForm>(EMPTY_FORM);

  // Scope units by selected level (from admin scope)
  const scopedUnits = useMemo(() => {
    const list = units ?? [];
    return scope.levelId ? list.filter((u: any) => u.level_id === scope.levelId) : list;
  }, [units, scope.levelId]);

  const scopedUnitIds = useMemo(() => new Set(scopedUnits.map((u: any) => u.id)), [scopedUnits]);

  // Quizzes restricted to the selected Unit (or all scoped units when no unit picked)
  const scopedQuizzes = useMemo(() => {
    return (quizzes ?? []).filter((q: any) => {
      if (scope.unitId) return q.unit_id === scope.unitId;
      return scopedUnitIds.has(q.unit_id);
    });
  }, [quizzes, scope.unitId, scopedUnitIds]);

  const scopedQuizIds = useMemo(() => scopedQuizzes.map((q: any) => q.id), [scopedQuizzes]);

  const {
    data: listeningQuestions,
    isLoading,
  } = useQuery({
    queryKey: ["admin-listening-questions", scopedQuizIds.slice().sort().join(",")],
    queryFn: async () => {
      if (scopedQuizIds.length === 0) return [];
      // Fetch each quiz's questions via admin-only RPC (returns correct_answer for admins),
      // then flatten and keep only listening-type questions.
      const results = await Promise.all(
        scopedQuizIds.map(async (quizId) => {
          const { data, error } = await supabase.rpc("admin_get_quiz_questions", {
            _quiz_id: quizId,
          });
          if (error) throw error;
          return (data ?? []).map((q: any) => ({ ...q, quiz_id: quizId }));
        })
      );
      return results.flat().filter((q: any) => q.type === "listening");
    },
    enabled: scopedQuizIds.length > 0,
  });

  const unitById = useMemo(() => {
    const map = new Map<string, any>();
    (units ?? []).forEach((u: any) => {
      const level = levels?.find((l: any) => l.id === u.level_id);
      const dialect = dialects?.find((d: any) => d.id === level?.dialect_id);
      map.set(u.id, { ...u, levelName: level?.name, dialectName: dialect?.name });
    });
    return map;
  }, [units, levels, dialects]);

  const quizToUnit = useMemo(() => {
    const map = new Map<string, string>();
    (quizzes ?? []).forEach((q: any) => map.set(q.id, q.unit_id));
    return map;
  }, [quizzes]);

  const filtered = useMemo(() => {
    const list = listeningQuestions ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row: any) => {
      const unitId = quizToUnit.get(row.quiz_id);
      const unit = unitId ? unitById.get(unitId) : undefined;
      return (
        row.prompt?.toLowerCase().includes(q) ||
        row.correct_answer?.toLowerCase().includes(q) ||
        unit?.title?.toLowerCase().includes(q)
      );
    });
  }, [listeningQuestions, search, quizToUnit, unitById]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-listening-questions"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: ListeningForm) => {
      const { error } = await supabase.from("quiz_questions").insert({
        quiz_id: data.quiz_id,
        prompt: data.prompt,
        type: "listening",
        correct_answer: data.correct_answer,
        options_json: data.options_json.filter((o) => o.trim()),
        order_index: data.order_index,
        audio_url: data.audio_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Listening question created");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ListeningForm }) => {
      const { error } = await supabase
        .from("quiz_questions")
        .update({
          prompt: data.prompt,
          correct_answer: data.correct_answer,
          options_json: data.options_json.filter((o) => o.trim()),
          order_index: data.order_index,
          audio_url: data.audio_url,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Listening question updated");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Question deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    const defaultQuiz = scopedQuizzes[0]?.id ?? "";
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      quiz_id: defaultQuiz,
      order_index: (listeningQuestions?.length ?? 0) + 1,
    });
    setDialogOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    const options = Array.isArray(row.options_json) ? row.options_json : [];
    setForm({
      quiz_id: row.quiz_id,
      prompt: row.prompt ?? "",
      correct_answer: row.correct_answer ?? "",
      options_json: [...options, "", "", "", ""].slice(0, 4),
      order_index: row.order_index ?? 0,
      audio_url: row.audio_url ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.quiz_id) {
      toast.error("Pick a quiz for this question");
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const updateOption = (i: number, value: string) => {
    const next = [...form.options_json];
    next[i] = value;
    setForm({ ...form, options_json: next });
  };

  const hint = scope.currentUnit
    ? `Showing listening questions in ${scope.currentUnit.title}.`
    : scope.currentLevel
      ? `Showing listening questions in ${scope.currentLevel.label}. Pick a unit to narrow further.`
      : "Pick a Course / Level (and optionally a Unit) above to scope listening questions.";

  const canAdd = scopedQuizzes.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" /> Listening Questions
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{hint}</p>
          </div>
          <Button onClick={openAdd} disabled={!canAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Listening Question
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by prompt, answer, or unit..."
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {scopedQuizIds.length === 0
                ? "No quizzes exist in the current scope yet. Create a quiz for this unit in the Quizzes tab first."
                : "No listening questions in this scope."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Correct Answer</TableHead>
                  <TableHead>Audio</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row: any) => {
                  const unitId = quizToUnit.get(row.quiz_id);
                  const unit = unitId ? unitById.get(unitId) : undefined;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{unit?.title ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {unit?.dialectName} / {unit?.levelName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{row.prompt}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.correct_answer}</TableCell>
                      <TableCell>
                        {row.audio_url ? (
                          <Badge variant="secondary">Audio</Badge>
                        ) : (
                          <Badge variant="outline">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>{row.order_index}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Listening Question" : "Add Listening Question"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quiz (Unit)</Label>
                  <Select
                    value={form.quiz_id}
                    onValueChange={(v) => setForm({ ...form, quiz_id: v })}
                    disabled={!!editing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a quiz" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopedQuizzes.map((q: any) => {
                        const unit = unitById.get(q.unit_id);
                        return (
                          <SelectItem key={q.id} value={q.id}>
                            {unit?.title ?? q.unit_id}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.order_index}
                    onChange={(e) =>
                      setForm({ ...form, order_index: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={form.prompt}
                  rows={2}
                  onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Answer Options</Label>
                <div className="grid grid-cols-2 gap-2">
                  {form.options_json.map((o, i) => (
                    <Input
                      key={i}
                      value={o}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select
                  value={form.correct_answer}
                  onValueChange={(v) => setForm({ ...form, correct_answer: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.options_json
                      .filter((o) => o.trim())
                      .map((o, i) => (
                        <SelectItem key={i} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audio</Label>
                <AudioUploader
                  value={form.audio_url}
                  onChange={(url) => setForm({ ...form, audio_url: url })}
                  arabicText={form.prompt}
                  folder="quiz-audio"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  !form.correct_answer ||
                  !form.quiz_id
                }
              >
                {editing ? "Save Changes" : "Add Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listening Question</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
