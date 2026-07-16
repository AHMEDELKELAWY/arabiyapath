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
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminFlashcardCards from "@/pages/admin/AdminFlashcardCards";
import {
  Headphones, BookOpen, ScrollText, ClipboardCheck, Sparkles,
  Video, Youtube, Loader2, Trash2, Upload,
} from "lucide-react";

const CONTENT_BUCKET = "content";

type QuestionType = string;


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


/* ---------------------------------- Test ---------------------------------- */

function TestTab({ unit }: { unit: any }) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

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

  const hasQuestions = (questions?.length ?? 0) > 0;

  const generate = async () => {
    if (!unit.lesson_topic || unit.lesson_topic.trim().length < 10) {
      return toast({
        title: "Add a Lesson Topic first",
        description: "The AI uses the Lesson Topic as its main reference. Edit the unit and fill it in.",
        variant: "destructive",
      });
    }
    if (hasQuestions && !confirm("Regenerate will delete the current test and create a new one. Continue?")) return;

    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-intermediate-test", {
      body: { unit_id: unit.id },
    });
    setGenerating(false);
    if (error) return toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    toast({ title: `Generated ${data?.inserted ?? 0} questions` });
    qc.invalidateQueries({ queryKey: ["admin-intermediate-tests", unit.id] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-medium">AI-generated Test</p>
            <p className="text-xs text-muted-foreground">
              Auto-generated from Lesson Topic, Learn vocabulary and Grammar. No manual authoring needed —
              just click Generate. Regenerate replaces the existing set.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {hasQuestions ? "Regenerate Test" : "Generate Test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasQuestions && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No questions yet. Click <strong>Generate Test</strong> to create a full Intermediate assessment.
        </p>
      )}

      <div className="grid gap-2">
        {questions?.map((q) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded bg-muted">{q.question_type.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">#{q.order_index}</span>
              </div>
              <p className="text-sm font-medium">{q.question}</p>
              {q.passage && (
                <p className="text-xs text-muted-foreground mt-1 italic" dir="rtl" lang="ar">
                  {q.passage}
                </p>
              )}
              {q.options && Array.isArray(q.options) && (
                <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                  {q.options.map((o: any, i: number) => (
                    <li key={i}>{typeof o === "string" ? o : JSON.stringify(o)}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs mt-1"><strong>Answer:</strong> {typeof q.correct_answer === "string" ? q.correct_answer : JSON.stringify(q.correct_answer)}</p>
              {q.explanation && (
                <p className="text-xs mt-1 text-muted-foreground"><strong>Why:</strong> {q.explanation}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

