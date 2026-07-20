/**
 * Intermediate Unit — Test Editor
 *
 * Full editor for AI-generated test questions. The AI produces a draft; the
 * admin owns every question afterward (edit, add, delete, duplicate, reorder,
 * regenerate-one, regenerate-all, save, publish). No AI runs on save/publish.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sparkles, Loader2, Plus, MoreVertical, GripVertical, Pencil, Copy, Trash2,
  ArrowUp, ArrowDown, RotateCcw, Check, Eye, ArrowDownCircle, ArrowUpCircle, Wand2, Shuffle, Repeat,
} from "lucide-react";
import { IntermediateTestRunner } from "@/components/flashcards/msa/IntermediateTestRunner";

/* ---------- Types ---------- */

export type QuestionType =
  | "multiple_choice" | "grammar_selection" | "conversation_completion"
  | "vocab_in_context" | "fill_in_blank" | "sentence_ordering" | "word_ordering"
  | "matching" | "reading_comprehension" | "listening_comprehension"
  | "true_false" | "image_question" | "choose_correct_sentence" | "find_the_mistake"
  | "audio";

export interface TestQuestion {
  id: string;
  unit_id: string;
  order_index: number;
  question_type: QuestionType | string;
  question: string;
  passage: string | null;
  options: any;
  correct_answer: any;
  explanation: string | null;
  audio_url: string | null;
  image_url: string | null;
  difficulty: string | null;
  points: number;
  published: boolean;
  skills_tested?: string[] | null;
  lesson_concepts?: string[] | null;
  vocabulary_used?: string[] | null;
  grammar_concepts_used?: string[] | null;
  ai_version?: string | null;
  generated_at?: string | null;
}

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "grammar_selection", label: "Grammar in Context" },
  { value: "conversation_completion", label: "Conversation Completion" },
  { value: "vocab_in_context", label: "Vocabulary Meaning" },
  { value: "fill_in_blank", label: "Fill in the Blank" },
  { value: "sentence_ordering", label: "Word Ordering" },
  { value: "matching", label: "Matching" },
  { value: "reading_comprehension", label: "Reading Comprehension" },
  { value: "listening_comprehension", label: "Listening Comprehension" },
  { value: "image_question", label: "Image Question" },
  { value: "choose_correct_sentence", label: "Choose the Correct Sentence" },
  { value: "find_the_mistake", label: "Find the Mistake" },
  { value: "audio", label: "Audio" },
];

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

function typeLabel(t: string) {
  return TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t.replace(/_/g, " ");
}

type RegenMode = "regenerate" | "easier" | "harder" | "improve_distractors" | "rewrite" | "change_type";

/* ---------- Root ---------- */

export function TestEditor({ unit }: { unit: any }) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<TestQuestion | null>(null);
  const [creating, setCreating] = useState<QuestionType | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TestQuestion | null>(null);
  const [regenId, setRegenId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [changeTypeFor, setChangeTypeFor] = useState<TestQuestion | null>(null);

  const { data: questions } = useQuery<TestQuestion[]>({
    queryKey: ["admin-intermediate-tests", unit.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_unit_tests")
        .select("*")
        .eq("unit_id", unit.id)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = questions ?? [];
  const hasQuestions = list.length > 0;
  const allPublished = hasQuestions && list.every((q) => q.published);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-intermediate-tests", unit.id] });

  /* ---------- Generate full test ---------- */
  const regenerateAll = async () => {
    if (!unit.lesson_topic || unit.lesson_topic.trim().length < 10) {
      return toast({
        title: "Add a Lesson Topic first",
        description: "The AI uses the Lesson Topic as its main reference. Edit the unit and fill it in.",
        variant: "destructive",
      });
    }
    if (hasQuestions && !confirm("Regenerate will delete the current test draft and create a new one. Continue?")) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-intermediate-test", {
      body: { unit_id: unit.id },
    });
    setGenerating(false);
    if (error) return toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    toast({ title: `Generated ${data?.inserted ?? 0} questions — review, edit, then publish` });
    invalidate();
  };

  /* ---------- Regenerate one (with modes) ---------- */
  const regenerateOne = async (q: TestQuestion, mode: RegenMode = "regenerate", target_type?: QuestionType) => {
    setRegenId(q.id);
    const { error } = await supabase.functions.invoke("regenerate-intermediate-question", {
      body: { question_id: q.id, mode, target_type },
    });
    setRegenId(null);
    if (error) return toast({ title: "Regenerate failed", description: error.message, variant: "destructive" });
    const label = mode === "regenerate" ? "regenerated"
      : mode === "easier" ? "made easier"
      : mode === "harder" ? "made harder"
      : mode === "improve_distractors" ? "distractors improved"
      : mode === "rewrite" ? "rewritten"
      : mode === "change_type" ? `converted to ${typeLabel(target_type ?? "")}`
      : "updated";
    toast({ title: `Question ${label}` });
    invalidate();
  };

  /* ---------- Reorder ---------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const applyOrder = async (ordered: TestQuestion[]) => {
    // Optimistic update
    qc.setQueryData(["admin-intermediate-tests", unit.id], ordered.map((q, i) => ({ ...q, order_index: i + 1 })));
    // Persist. Use unique large temporary indexes to avoid unique clashes, then final.
    // Simpler: bulk update sequentially.
    for (let i = 0; i < ordered.length; i++) {
      await (supabase as any)
        .from("flashcard_unit_tests")
        .update({ order_index: i + 1 })
        .eq("id", ordered[i].id);
    }
    invalidate();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = list.findIndex((q) => q.id === active.id);
    const newIndex = list.findIndex((q) => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    applyOrder(reordered);
  };

  const moveBy = (q: TestQuestion, delta: number) => {
    const idx = list.findIndex((x) => x.id === q.id);
    const target = idx + delta;
    if (target < 0 || target >= list.length) return;
    applyOrder(arrayMove(list, idx, target));
  };

  const duplicate = async (q: TestQuestion) => {
    const nextIndex = list.length + 1;
    const { id, created_at, updated_at, ...rest } = q as any;
    const { error } = await (supabase as any)
      .from("flashcard_unit_tests")
      .insert({ ...rest, order_index: nextIndex, published: false });
    if (error) return toast({ title: "Duplicate failed", description: error.message, variant: "destructive" });
    toast({ title: "Question duplicated" });
    invalidate();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    const { error } = await (supabase as any)
      .from("flashcard_unit_tests")
      .delete()
      .eq("id", target.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    // Renumber the rest
    const remaining = list.filter((q) => q.id !== target.id);
    for (let i = 0; i < remaining.length; i++) {
      await (supabase as any)
        .from("flashcard_unit_tests")
        .update({ order_index: i + 1 })
        .eq("id", remaining[i].id);
    }
    toast({ title: "Question deleted" });
    invalidate();
  };

  /* ---------- Publish all ---------- */
  const publishAll = async () => {
    setPublishing(true);
    const { error } = await (supabase as any)
      .from("flashcard_unit_tests")
      .update({ published: true })
      .eq("unit_id", unit.id);
    setPublishing(false);
    if (error) return toast({ title: "Publish failed", description: error.message, variant: "destructive" });
    toast({ title: "Test published" });
    invalidate();
  };

  const unpublishAll = async () => {
    setPublishing(true);
    const { error } = await (supabase as any)
      .from("flashcard_unit_tests")
      .update({ published: false })
      .eq("unit_id", unit.id);
    setPublishing(false);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Test set to draft" });
    invalidate();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Test Editor</p>
            <p className="text-xs text-muted-foreground">
              AI drafts. You own every question. Nothing regenerates on save or publish.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreating("multiple_choice")}>
              <Plus className="w-4 h-4 mr-1" /> Add question
            </Button>
            <Button variant="outline" size="sm" onClick={regenerateAll} disabled={generating}>
              {generating
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <Sparkles className="w-4 h-4 mr-1" />}
              {hasQuestions ? "Regenerate test" : "Generate test"}
            </Button>
            {hasQuestions && (
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="w-4 h-4 mr-1" /> Student Preview
              </Button>
            )}
            {hasQuestions && (
              allPublished ? (
                <Button variant="outline" size="sm" onClick={unpublishAll} disabled={publishing}>
                  Move to draft
                </Button>
              ) : (
                <Button size="sm" onClick={publishAll} disabled={publishing}>
                  {publishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Publish
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {!hasQuestions ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No questions yet. Click <strong>Generate test</strong> or <strong>Add question</strong> to start.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-2">
              {list.map((q, i) => (
                <SortableQuestionRow
                  key={q.id}
                  q={q}
                  index={i}
                  count={list.length}
                  regenerating={regenId === q.id}
                  onEdit={() => setEditing(q)}
                  onDuplicate={() => duplicate(q)}
                  onDelete={() => setPendingDelete(q)}
                  onMoveUp={() => moveBy(q, -1)}
                  onMoveDown={() => moveBy(q, 1)}
                  onRegenerate={() => regenerateOne(q, "regenerate")}
                  onEasier={() => regenerateOne(q, "easier")}
                  onHarder={() => regenerateOne(q, "harder")}
                  onImproveDistractors={() => regenerateOne(q, "improve_distractors")}
                  onRewrite={() => regenerateOne(q, "rewrite")}
                  onChangeType={() => setChangeTypeFor(q)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit dialog */}
      <QuestionEditorDialog
        open={!!editing}
        question={editing ?? undefined}
        unitId={unit.id}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); invalidate(); }}
      />

      {/* Create dialog */}
      <QuestionEditorDialog
        open={!!creating}
        createType={creating ?? undefined}
        unitId={unit.id}
        nextIndex={list.length + 1}
        onClose={() => setCreating(null)}
        onSaved={() => { setCreating(null); invalidate(); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              Question #{pendingDelete?.order_index} will be removed and the rest will be renumbered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Sortable row ---------- */

function SortableQuestionRow({
  q, index, count, regenerating,
  onEdit, onDuplicate, onDelete, onMoveUp, onMoveDown,
  onRegenerate, onEasier, onHarder, onImproveDistractors, onRewrite, onChangeType,
}: {
  q: TestQuestion;
  index: number;
  count: number;
  regenerating: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRegenerate: () => void;
  onEasier: () => void;
  onHarder: () => void;
  onImproveDistractors: () => void;
  onRewrite: () => void;
  onChangeType: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? "shadow-lg" : ""}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
              <Badge variant="secondary" className="text-[10px]">{typeLabel(q.question_type)}</Badge>
              {q.difficulty && <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>}
              {!q.published && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
              {regenerating && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-sm font-medium truncate" dir="auto">{q.question || <em className="text-muted-foreground">Untitled question</em>}</p>
            {q.passage && (
              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2" dir="rtl" lang="ar">{q.passage}</p>
            )}
            {Array.isArray(q.options) && q.options.length > 0 && (
              <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside line-clamp-3">
                {q.options.slice(0, 4).map((o: any, i: number) => (
                  <li key={i}>{typeof o === "string" ? o : JSON.stringify(o)}</li>
                ))}
              </ul>
            )}
            <p className="text-xs mt-1">
              <strong>Answer:</strong>{" "}
              {typeof q.correct_answer === "string" ? q.correct_answer : JSON.stringify(q.correct_answer)}
            </p>
            {q.explanation && (
              <p className="text-xs mt-1 text-muted-foreground line-clamp-2"><strong>Why:</strong> {q.explanation}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}><Pencil className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}><Copy className="w-4 h-4 mr-2" />Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={onRegenerate}><RotateCcw className="w-4 h-4 mr-2" />Regenerate this question</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onMoveUp} disabled={index === 0}><ArrowUp className="w-4 h-4 mr-2" />Move up</DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveDown} disabled={index === count - 1}><ArrowDown className="w-4 h-4 mr-2" />Move down</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Editor Dialog ---------- */

interface EditorForm {
  question_type: QuestionType;
  question: string;
  passage: string;
  difficulty: string;
  points: number;
  explanation: string;
  audio_url: string;
  image_url: string;
  optionsText: string;      // one option per line (or "left | right" for matching)
  correctText: string;      // string for MC types; comma-separated tokens for ordering; "left=right" per line for matching
  published: boolean;
}

function emptyForm(t: QuestionType): EditorForm {
  return {
    question_type: t,
    question: "",
    passage: "",
    difficulty: "medium",
    points: 1,
    explanation: "",
    audio_url: "",
    image_url: "",
    optionsText: "",
    correctText: "",
    published: false,
  };
}

function questionToForm(q: TestQuestion): EditorForm {
  const isMatching = q.question_type === "matching";
  const isOrdering = q.question_type === "sentence_ordering";

  let optionsText = "";
  if (Array.isArray(q.options)) {
    if (isMatching) {
      optionsText = q.options.map((p: any) => `${p?.left ?? ""} | ${p?.right ?? ""}`).join("\n");
    } else {
      optionsText = q.options.map((o: any) => (typeof o === "string" ? o : JSON.stringify(o))).join("\n");
    }
  }

  let correctText = "";
  if (isMatching && q.correct_answer && typeof q.correct_answer === "object" && !Array.isArray(q.correct_answer)) {
    correctText = Object.entries(q.correct_answer as Record<string, string>)
      .map(([l, r]) => `${l} = ${r}`).join("\n");
  } else if (isOrdering && Array.isArray(q.correct_answer)) {
    correctText = (q.correct_answer as string[]).join(" | ");
  } else if (Array.isArray(q.correct_answer)) {
    correctText = q.correct_answer.join(" | ");
  } else {
    correctText = q.correct_answer == null ? "" : String(q.correct_answer);
  }

  return {
    question_type: (q.question_type as QuestionType) ?? "multiple_choice",
    question: q.question ?? "",
    passage: q.passage ?? "",
    difficulty: q.difficulty ?? "medium",
    points: q.points ?? 1,
    explanation: q.explanation ?? "",
    audio_url: q.audio_url ?? "",
    image_url: q.image_url ?? "",
    optionsText,
    correctText,
    published: !!q.published,
  };
}

function serializeForm(form: EditorForm): {
  ok: true;
  row: Partial<TestQuestion>;
} | { ok: false; error: string } {
  if (!form.question.trim()) return { ok: false, error: "Question text is required." };

  const t = form.question_type;
  let options: any = null;
  let correct_answer: any = "";

  const lines = form.optionsText.split("\n").map((l) => l.trim()).filter(Boolean);

  if (t === "matching") {
    options = lines.map((l) => {
      const [left, right] = l.split("|").map((x) => x.trim());
      return { left: left ?? "", right: right ?? "" };
    });
    const mapping: Record<string, string> = {};
    form.correctText.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l) => {
      const [left, right] = l.split("=").map((x) => x.trim());
      if (left) mapping[left] = right ?? "";
    });
    correct_answer = mapping;
    if (options.length < 2) return { ok: false, error: "Matching needs at least 2 pairs." };
  } else if (t === "sentence_ordering") {
    options = lines;
    correct_answer = form.correctText.split("|").map((x) => x.trim()).filter(Boolean);
    if (options.length < 2) return { ok: false, error: "Sentence ordering needs at least 2 tokens." };
    if (!(correct_answer as string[]).length) return { ok: false, error: "Provide the correct order." };
  } else if (t === "reading_comprehension") {
    if (!form.passage.trim()) return { ok: false, error: "Reading comprehension requires a passage." };
    options = lines;
    correct_answer = form.correctText.trim();
    if (options.length < 2) return { ok: false, error: "Provide at least 2 options." };
    if (!correct_answer) return { ok: false, error: "Correct answer is required." };
  } else {
    // multiple_choice, grammar_selection, conversation_completion,
    // vocab_in_context, fill_in_blank, audio
    options = lines;
    correct_answer = form.correctText.trim();
    if (options.length < 2) return { ok: false, error: "Provide at least 2 options." };
    if (!correct_answer) return { ok: false, error: "Correct answer is required." };
    if (!options.includes(correct_answer)) {
      return { ok: false, error: "Correct answer must match one of the options exactly." };
    }
  }

  return {
    ok: true,
    row: {
      question_type: t,
      question: form.question.trim(),
      passage: form.passage.trim() || null,
      options,
      correct_answer,
      explanation: form.explanation.trim() || null,
      audio_url: form.audio_url.trim() || null,
      image_url: form.image_url.trim() || null,
      difficulty: form.difficulty || null,
      points: Number.isFinite(form.points) ? form.points : 1,
      published: form.published,
    },
  };
}

function QuestionEditorDialog({
  open, question, createType, unitId, nextIndex, onClose, onSaved,
}: {
  open: boolean;
  question?: TestQuestion;
  createType?: QuestionType;
  unitId: string;
  nextIndex?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = !question;
  const initial = question ? questionToForm(question) : emptyForm(createType ?? "multiple_choice");
  const [form, setForm] = useState<EditorForm>(initial);
  const [saving, setSaving] = useState(false);

  // Reset form whenever the dialog is opened with a different question/type
  useMemoOpen(open, () => setForm(question ? questionToForm(question) : emptyForm(createType ?? "multiple_choice")));

  const t = form.question_type;
  const showPassage = t === "reading_comprehension";
  const isMatching = t === "matching";
  const isOrdering = t === "sentence_ordering";

  const optionsPlaceholder = isMatching
    ? "left | right   (one pair per line)"
    : isOrdering
      ? "one token per line — displayed shuffled to learners"
      : "one option per line";

  const correctPlaceholder = isMatching
    ? "left = right   (one mapping per line)"
    : isOrdering
      ? "token1 | token2 | token3 (correct order, pipe-separated)"
      : "exact text of the correct option";

  const save = async () => {
    const result = serializeForm(form);
    if (result.ok !== true) {
      toast({ title: "Missing info", description: (result as { error: string }).error, variant: "destructive" });
      return;
    }
    setSaving(true);
    if (isCreate) {
      const { error } = await (supabase as any)
        .from("flashcard_unit_tests")
        .insert({ ...result.row, unit_id: unitId, order_index: nextIndex ?? 1 });
      setSaving(false);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Question added" });
    } else {
      const { error } = await (supabase as any)
        .from("flashcard_unit_tests")
        .update(result.row)
        .eq("id", question!.id);
      setSaving(false);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Question saved" });
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Add question" : `Edit question #${question!.order_index}`}</DialogTitle>
          <DialogDescription>
            All fields save exactly as entered. Publishing does not regenerate anything.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Question type</Label>
              <Select
                value={form.question_type}
                onValueChange={(v) => setForm((f) => ({ ...f, question_type: v as QuestionType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Question (Arabic / prompt)</Label>
            <Textarea
              rows={2}
              dir="auto"
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Enter the question shown to the learner"
            />
          </div>

          {showPassage && (
            <div>
              <Label>Passage (Arabic)</Label>
              <Textarea
                rows={3}
                dir="rtl"
                lang="ar"
                value={form.passage}
                onChange={(e) => setForm((f) => ({ ...f, passage: e.target.value }))}
              />
            </div>
          )}

          <div>
            <Label>Options</Label>
            <Textarea
              rows={4}
              value={form.optionsText}
              onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
              placeholder={optionsPlaceholder}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {isMatching
                ? "One pair per line, separated by |."
                : isOrdering
                  ? "One token per line. Learners see them shuffled."
                  : "One option per line."}
            </p>
          </div>

          <div>
            <Label>Correct answer</Label>
            <Textarea
              rows={isMatching ? 4 : 2}
              value={form.correctText}
              onChange={(e) => setForm((f) => ({ ...f, correctText: e.target.value }))}
              placeholder={correctPlaceholder}
            />
          </div>

          <div>
            <Label>Explanation</Label>
            <Textarea
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              placeholder="Short reasoning shown after answering"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label>Audio URL</Label>
              <Input
                value={form.audio_url}
                onChange={(e) => setForm((f) => ({ ...f, audio_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Points</Label>
              <Input
                type="number"
                min={0}
                value={form.points}
                onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                />
                Published
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isCreate ? "Add question" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Tiny helper: re-run an effect when `open` transitions to true. */
function useMemoOpen(open: boolean, run: () => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { if (open) run(); }, [open]);
}
