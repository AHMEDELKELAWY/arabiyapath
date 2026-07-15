/**
 * Intermediate unit renderer.
 * Route: /flashcards/intermediate/unit/:slug
 * Tabs: Listening → Learn → Grammar → Test
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Lock, BookOpen, Headphones, GraduationCap, ScrollText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardUnitAccess } from "@/lib/flashcardAccess";
import { LearnVocabBrowser } from "@/components/flashcards/msa/LearnVocabBrowser";
import { GrammarBrowser } from "@/components/flashcards/msa/GrammarBrowser";

const CONTENT_BUCKET = "content";

type Tab = "listening" | "learn" | "grammar" | "test";

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

interface TestQuestion {
  id: string;
  question_type: string;
  question: string;
  passage: string | null;
  options: any;
  correct_answer: any;
  explanation: string | null;
  order_index: number;
}

function LockedCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{body}</p>
        <Button asChild className="mt-2">
          <Link to="/pricing"><Lock className="w-4 h-4 mr-2" /> Join Membership</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ListeningPlayer({ videoUrl, storagePath }: { videoUrl: string | null; storagePath: string | null }) {
  if (storagePath) {
    const publicUrl = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    return <video src={publicUrl} controls className="w-full rounded-lg border" />;
  }
  if (videoUrl) {
    return (
      <div className="rounded-lg border overflow-hidden aspect-video bg-muted">
        <iframe
          src={toYouTubeEmbed(videoUrl)}
          title="Lesson video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <p className="text-sm text-muted-foreground text-center py-8">
      No video has been added to this lesson yet.
    </p>
  );
}

function TestRunner({ unitId }: { unitId: string }) {
  const { data: questions, isLoading } = useQuery<TestQuestion[]>({
    queryKey: ["fc-unit-test", unitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_unit_tests")
        .select("id,question_type,question,passage,options,correct_answer,explanation,order_index")
        .eq("unit_id", unitId)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading questions…</p>;
  if (!questions?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No test questions yet. Check back soon.
      </p>
    );
  }

  const normalize = (v: any) => (typeof v === "string" ? v : Array.isArray(v) ? v.join("|") : JSON.stringify(v));

  const score = questions.reduce((n, q) => {
    const user = answers[q.id];
    if (!user) return n;
    return normalize(q.correct_answer) === user ? n + 1 : n;
  }, 0);

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const opts: string[] = Array.isArray(q.options) ? q.options : [];
        const userAnswer = answers[q.id];
        const correct = normalize(q.correct_answer);
        return (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-muted">{q.question_type.replace(/_/g, " ")}</span>
                <span>Question {i + 1} / {questions.length}</span>
              </div>
              {q.passage && (
                <p className="text-sm bg-muted/40 rounded p-3" dir="rtl" lang="ar">{q.passage}</p>
              )}
              <p className="font-medium">{q.question}</p>
              {opts.length > 0 ? (
                <div className="grid gap-2">
                  {opts.map((opt, idx) => {
                    const chosen = userAnswer === opt;
                    const isCorrect = submitted && opt === correct;
                    const isWrong = submitted && chosen && opt !== correct;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={`text-left px-3 py-2 rounded border text-sm transition-colors ${
                          isCorrect
                            ? "border-emerald-500 bg-emerald-500/10"
                            : isWrong
                            ? "border-destructive bg-destructive/10"
                            : chosen
                            ? "border-primary bg-primary/10"
                            : "hover:bg-accent"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  disabled={submitted}
                  value={userAnswer ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="w-full px-3 py-2 rounded border bg-background text-sm"
                  placeholder="Type your answer…"
                />
              )}
              {submitted && q.explanation && (
                <p className="text-xs text-muted-foreground border-l-2 pl-3">{q.explanation}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
      {!submitted ? (
        <Button onClick={() => setSubmitted(true)} className="w-full sm:w-auto">
          Submit answers
        </Button>
      ) : (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Score: {score} / {questions.length}</p>
              <p className="text-xs text-muted-foreground">Review your answers above.</p>
            </div>
            <Button variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); }}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function IntermediateUnit() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("listening");

  const { data: unit, isLoading } = useQuery({
    queryKey: ["fc-intermediate-unit", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,title_ar,description,is_free,video_url,video_storage_path,seo_title,seo_description")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: hasAccess } = useFlashcardUnitAccess(unit?.id);

  if (isLoading) return <Layout><div className="container py-16">Loading…</div></Layout>;
  if (!unit) return <Layout><div className="container py-16">Unit not found.</div></Layout>;

  const canStudy = unit.is_free || hasAccess;

  return (
    <Layout minimalFooter>
      <SEOHead
        title={unit.seo_title || `${unit.title_en} — Spoken Arabic (Intermediate)`}
        description={unit.seo_description || unit.description || "Intermediate Spoken Arabic lesson."}
        canonicalPath={`/flashcards/intermediate/unit/${unit.slug}`}
        noindex
      />
      <section className="container max-w-3xl py-4 md:py-8 px-4">
        <div className="mb-2 md:mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/flashcards/level/intermediate");
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Units
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">{unit.title_en}</h1>
        {unit.title_ar && (
          <p className="text-base md:text-xl text-muted-foreground mb-1" dir="rtl" lang="ar">
            {unit.title_ar}
          </p>
        )}

        <div className="mt-3 md:mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
            <div className="md:sticky md:top-16 md:z-30 -mx-4 px-4 py-2 md:bg-background/85 md:backdrop-blur md:border-b md:border-border/40">
              <TabsList className="grid w-full h-auto grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="listening" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <Headphones className="w-4 h-4" /> Listening
                </TabsTrigger>
                <TabsTrigger value="learn" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <BookOpen className="w-4 h-4" /> Learn
                </TabsTrigger>
                <TabsTrigger value="grammar" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <ScrollText className="w-4 h-4" /> Grammar
                </TabsTrigger>
                <TabsTrigger value="test" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <GraduationCap className="w-4 h-4" /> Test
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="listening" className="mt-3 md:mt-4">
              {canStudy ? (
                <ListeningPlayer videoUrl={unit.video_url} storagePath={unit.video_storage_path} />
              ) : (
                <LockedCard icon={Headphones} title="Listening" body="Watch the lesson video and follow along with the dialogue." />
              )}
            </TabsContent>

            <TabsContent value="learn" className="mt-3 md:mt-4">
              {canStudy ? (
                <LearnVocabBrowser unitId={unit.id} onComplete={() => setActiveTab("grammar")} />
              ) : (
                <LockedCard icon={BookOpen} title="Learn" body="Study each vocabulary card with Arabic, transliteration, English, image and audio." />
              )}
            </TabsContent>

            <TabsContent value="grammar" className="mt-3 md:mt-4">
              {canStudy ? (
                <GrammarBrowser unitId={unit.id} onComplete={() => setActiveTab("test")} />
              ) : (
                <LockedCard icon={ScrollText} title="Grammar" body="Concise grammar notes with clear examples for this lesson." />
              )}
            </TabsContent>

            <TabsContent value="test" className="mt-4">
              {canStudy ? (
                <TestRunner unitId={unit.id} />
              ) : (
                <LockedCard icon={GraduationCap} title="Test" body="A mixed quiz drawn from this lesson's video, vocabulary, and grammar." />
              )}
            </TabsContent>
          </Tabs>
        </div>
        {!user && (
          <p className="mt-6 text-xs text-muted-foreground text-center">
            <Link to="/signup" className="underline">Create a free account</Link> to save your progress.
          </p>
        )}
      </section>
    </Layout>
  );
}
