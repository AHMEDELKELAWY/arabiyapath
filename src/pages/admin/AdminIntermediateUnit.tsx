/**
 * Intermediate Unit authoring workspace.
 *
 * Route: /admin/flashcards/intermediate/unit/:id
 *
 * Four tabs:
 *   Listening  — YouTube URL or uploaded MP4 (stored in `content` bucket).
 *   Learn      — link out to the existing card editor filtered by kind=learn.
 *   Grammar    — link out to the existing card editor filtered by kind=grammar.
 *   Test       — AI-generated questions from Lesson Topic + Learn + Grammar + Listening.
 */
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminFlashcardCards from "@/pages/admin/AdminFlashcardCards";
import {
  Headphones, BookOpen, ScrollText, ClipboardCheck, Sparkles,
  Video, Youtube, Loader2, Pencil, Trash2, Plus, Upload,
} from "lucide-react";

const CONTENT_BUCKET = "content";

const QUESTION_TYPES = [
  { value: "listening", label: "Listening comprehension" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "grammar", label: "Grammar" },
  { value: "sentence_ordering", label: "Sentence ordering" },
  { value: "fill_blank", label: "Fill in the blank" },
  { value: "reading_comprehension", label: "Reading comprehension" },
] as const;

type QuestionType = typeof QUESTION_TYPES[number]["value"];

interface TestQuestion {
  id: string;
  unit_id: string;
  order_index: number;
  question_type: QuestionType;
  question: string;
  passage: string | null;
  options: any;
  correct_answer: any;
  explanation: string | null;
  audio_url: string | null;
  published: boolean;
}

export default function AdminIntermediateUnit() {
  const { id: unitId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: unit, isLoading } = useQuery({
    queryKey: ["admin-intermediate-unit", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("*")
        .eq("id", unitId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <AdminLayout><div className="p-6 text-sm text-muted-foreground">Loading…</div></AdminLayout>;
  }
  if (!unit) {
    return <AdminLayout><div className="p-6">Unit not found.</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="mb-4">
        <Link to="/admin/flashcards/units" className="text-xs text-muted-foreground hover:underline">
          ← Back to Units
        </Link>
        <h1 className="text-2xl font-bold mt-1">{unit.title_en}</h1>
        <p className="text-sm text-muted-foreground" dir="rtl">{unit.title_ar}</p>
      </div>

      <Tabs defaultValue="listening" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="listening"><Headphones className="w-4 h-4 mr-2" />Listening</TabsTrigger>
          <TabsTrigger value="learn"><BookOpen className="w-4 h-4 mr-2" />Learn</TabsTrigger>
          <TabsTrigger value="grammar"><ScrollText className="w-4 h-4 mr-2" />Grammar</TabsTrigger>
          <TabsTrigger value="test"><ClipboardCheck className="w-4 h-4 mr-2" />Test</TabsTrigger>
        </TabsList>

        <TabsContent value="listening" className="mt-4">
          <ListeningTab unit={unit} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-intermediate-unit", unitId] })} />
        </TabsContent>

        <TabsContent value="learn" className="mt-4">
          <AdminFlashcardCards embedded embeddedUnitId={unit.id} embeddedKind="learn" />
        </TabsContent>

        <TabsContent value="grammar" className="mt-4">
          <AdminFlashcardCards embedded embeddedUnitId={unit.id} embeddedKind="grammar" />
        </TabsContent>

        <TabsContent value="test" className="mt-4">
          <TestTab unit={unit} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

/* -------------------------------- Listening ------------------------------- */

function ListeningTab({ unit, onSaved }: { unit: any; onSaved: () => void }) {
  const [videoUrl, setVideoUrl] = useState<string>(unit.video_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadedPath = unit.video_storage_path as string | null;
  const uploadedPublicUrl = uploadedPath
    ? supabase.storage.from(CONTENT_BUCKET).getPublicUrl(uploadedPath).data.publicUrl
    : null;

  const saveUrl = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("flashcard_units")
      .update({ video_url: videoUrl.trim() || null })
      .eq("id", unit.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "YouTube URL saved" });
    onSaved();
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    const path = `intermediate-videos/${unit.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from(CONTENT_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setUploading(false);
      return toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
    }
    const { error: dbErr } = await (supabase as any)
      .from("flashcard_units")
      .update({ video_storage_path: path })
      .eq("id", unit.id);
    setUploading(false);
    if (dbErr) return toast({ title: "Save failed", description: dbErr.message, variant: "destructive" });
    toast({ title: "Video uploaded" });
    onSaved();
  };

  const clearUpload = async () => {
    if (!uploadedPath) return;
    if (!confirm("Remove the uploaded video?")) return;
    await supabase.storage.from(CONTENT_BUCKET).remove([uploadedPath]);
    await (supabase as any).from("flashcard_units").update({ video_storage_path: null }).eq("id", unit.id);
    onSaved();
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Youtube className="w-5 h-5" /> YouTube URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <Button onClick={saveUrl} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save URL
          </Button>
          {unit.video_url && (
            <div className="rounded-md border overflow-hidden aspect-video bg-muted">
              <iframe
                src={toYouTubeEmbed(unit.video_url)}
                title="YouTube preview"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Video className="w-5 h-5" /> Upload video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm border rounded-md px-3 py-2 hover:bg-accent w-fit">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Choose MP4"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadVideo(f);
                e.target.value = "";
              }}
            />
          </label>
          {uploadedPublicUrl && (
            <>
              <video src={uploadedPublicUrl} controls className="w-full rounded-md border" />
              <Button variant="outline" size="sm" onClick={clearUpload}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove upload
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Uploads are stored in the <code>content</code> bucket under <code>intermediate-videos/</code>.
            If both a YouTube URL and an upload exist, learners see the uploaded video first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = u.pathname.match(/\/shorts\/([\w-]+)/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
      const embed = u.pathname.match(/\/embed\/([\w-]+)/);
      if (embed) return `https://www.youtube.com/embed/${embed[1]}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
  } catch { /* fall through */ }
  return url;
}

/* --------------------------- Learn / Grammar link ------------------------- */

function LinkOutCard({
  title, description, href, unitId, kind,
}: { title: string; description: string; href: string; unitId: string; kind: "learn" | "grammar" }) {
  const { data: count } = useQuery({
    queryKey: ["admin-intermediate-cardcount", unitId, kind],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unitId)
        .eq("kind", kind);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-sm">
          <strong>{count ?? 0}</strong> card{count === 1 ? "" : "s"} in this unit.
        </p>
        <Button asChild>
          <Link to={href}>
            Open editor <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------- Test ---------------------------------- */

function TestTab({ unit }: { unit: any }) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<TestQuestion | null>(null);

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

  const generate = async () => {
    if (!unit.lesson_topic || unit.lesson_topic.trim().length < 10) {
      return toast({
        title: "Add a Lesson Topic first",
        description: "The AI uses the Lesson Topic as its main reference. Edit the unit and fill it in.",
        variant: "destructive",
      });
    }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-intermediate-test", {
      body: { unit_id: unit.id },
    });
    setGenerating(false);
    if (error) return toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    toast({ title: `Generated ${data?.inserted ?? 0} questions` });
    qc.invalidateQueries({ queryKey: ["admin-intermediate-tests", unit.id] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await (supabase as any).from("flashcard_unit_tests").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-intermediate-tests", unit.id] });
  };

  const addBlank = () => {
    setEditing({
      id: "",
      unit_id: unit.id,
      order_index: (questions?.length ?? 0) + 1,
      question_type: "vocabulary",
      question: "",
      passage: null,
      options: ["", "", "", ""],
      correct_answer: "",
      explanation: null,
      audio_url: null,
      published: true,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-medium">AI-generated Test</p>
            <p className="text-xs text-muted-foreground">
              Uses Lesson Topic, Listening video URL, Learn vocabulary, and Grammar cards as reference.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate Test
            </Button>
            <Button variant="outline" onClick={addBlank}>
              <Plus className="w-4 h-4 mr-2" /> Add manually
            </Button>
          </div>
        </CardContent>
      </Card>

      {!questions?.length && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No questions yet. Click <strong>Generate Test</strong> to create a set with AI, or add one manually.
        </p>
      )}

      <div className="grid gap-2">
        {questions?.map((q) => (
          <Card key={q.id}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">{q.question_type.replace(/_/g, " ")}</span>
                  {!q.published && <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-700">Draft</span>}
                  <span className="text-xs text-muted-foreground">#{q.order_index}</span>
                </div>
                <p className="text-sm font-medium">{q.question}</p>
                {q.options && Array.isArray(q.options) && (
                  <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                    {q.options.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                )}
                <p className="text-xs mt-1"><strong>Answer:</strong> {JSON.stringify(q.correct_answer)}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(q)}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => del(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <QuestionEditor
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-intermediate-tests", unit.id] });
          }}
        />
      )}
    </div>
  );
}

function QuestionEditor({
  value, onClose, onSaved,
}: { value: TestQuestion; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<TestQuestion>(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload: any = {
      unit_id: form.unit_id,
      order_index: form.order_index,
      question_type: form.question_type,
      question: form.question,
      passage: form.passage,
      options: form.options,
      correct_answer: form.correct_answer,
      explanation: form.explanation,
      audio_url: form.audio_url,
      published: form.published,
    };
    const { error } = form.id
      ? await (supabase as any).from("flashcard_unit_tests").update(payload).eq("id", form.id)
      : await (supabase as any).from("flashcard_unit_tests").insert(payload);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    onSaved();
  };

  const optionsText = Array.isArray(form.options) ? form.options.join("\n") : (form.options ? JSON.stringify(form.options) : "");
  const answerText = typeof form.correct_answer === "string"
    ? form.correct_answer
    : JSON.stringify(form.correct_answer);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit question" : "New question"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Question type</Label>
            <Select value={form.question_type} onValueChange={(v) => setForm({ ...form, question_type: v as QuestionType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Question</Label>
            <Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={2} />
          </div>
          {form.question_type === "reading_comprehension" && (
            <div>
              <Label>Passage</Label>
              <Textarea value={form.passage ?? ""} onChange={(e) => setForm({ ...form, passage: e.target.value })} rows={4} />
            </div>
          )}
          <div>
            <Label>Options (one per line, or leave empty for open-answer)</Label>
            <Textarea
              value={optionsText}
              onChange={(e) => {
                const arr = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                setForm({ ...form, options: arr.length ? arr : null });
              }}
              rows={4}
            />
          </div>
          <div>
            <Label>Correct answer (text, or JSON array for sentence ordering)</Label>
            <Textarea
              value={answerText}
              onChange={(e) => {
                const v = e.target.value;
                try {
                  setForm({ ...form, correct_answer: JSON.parse(v) });
                } catch {
                  setForm({ ...form, correct_answer: v });
                }
              }}
              rows={2}
            />
          </div>
          <div>
            <Label>Explanation (optional)</Label>
            <Textarea value={form.explanation ?? ""} onChange={(e) => setForm({ ...form, explanation: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Order</Label>
            <Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            <span className="text-sm">Published</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
