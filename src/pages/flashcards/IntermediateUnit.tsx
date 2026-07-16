/**
 * Intermediate unit renderer.
 * Route: /flashcards/intermediate/unit/:slug
 *
 * Sequential learning flow:
 *   1. Listening  → user must click "Continue to Learn" (or "Mark watched") to progress.
 *   2. Learn      → unlocks after Listening completed.
 *   3. Grammar    → unlocks after Learn completed.
 *   4. Test       → unlocks after Grammar completed.
 *
 * Completion state is persisted per-user in `flashcard_intermediate_progress`.
 * Beginner is not affected by this file.
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Lock, BookOpen, Headphones, GraduationCap, ScrollText,
  AlertCircle, CheckCircle2, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardUnitAccess } from "@/lib/flashcardAccess";
import { LearnVocabBrowser } from "@/components/flashcards/msa/LearnVocabBrowser";
import { GrammarBrowser } from "@/components/flashcards/msa/GrammarBrowser";
import { IntermediateTestRunner } from "@/components/flashcards/msa/IntermediateTestRunner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CONTENT_BUCKET = "content";

type Tab = "listening" | "learn" | "grammar" | "test";
const TAB_ORDER: Tab[] = ["listening", "learn", "grammar", "test"];

interface ProgressRow {
  listening_completed_at: string | null;
  learn_completed_at: string | null;
  grammar_completed_at: string | null;
  test_completed_at: string | null;
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

function TabLocked({ prevLabel }: { prevLabel: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Locked</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Finish <strong>{prevLabel}</strong> first to unlock this step.
        </p>
      </CardContent>
    </Card>
  );
}

function ListeningPlayer({
  videoUrl, storagePath, alreadyDone, onContinue,
}: {
  videoUrl: string | null;
  storagePath: string | null;
  alreadyDone: boolean;
  onContinue: () => void;
}) {
  if (!storagePath && !videoUrl) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center py-8">
          No video has been added to this lesson yet.
        </p>
        <div className="flex justify-center">
          <Button onClick={onContinue} className="gap-1 min-h-[44px]">
            Continue to Learn <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="mx-auto w-full md:w-[70%] max-w-[720px]">
        {storagePath ? (
          <video
            src={supabase.storage.from(CONTENT_BUCKET).getPublicUrl(storagePath).data.publicUrl}
            controls
            className="w-full rounded-lg border max-h-[60vh] bg-black"
          />
        ) : (
          <div className="rounded-lg border overflow-hidden aspect-video bg-muted max-h-[60vh]">
            <iframe
              src={toYouTubeEmbed(videoUrl!)}
              title="Lesson video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <Button onClick={onContinue} className="gap-1 min-h-[44px]">
          {alreadyDone ? "Continue to Learn" : "I've watched — Continue to Learn"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function IntermediateUnit() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("listening");

  const { data: unit, isLoading, error, refetch } = useQuery({
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

  const { data: progress } = useQuery<ProgressRow | null>({
    queryKey: ["fc-intermediate-progress", user?.id, unit?.id],
    enabled: !!user?.id && !!unit?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_intermediate_progress")
        .select("listening_completed_at,learn_completed_at,grammar_completed_at,test_completed_at")
        .eq("user_id", user!.id)
        .eq("unit_id", unit!.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data ?? null) as ProgressRow | null;
    },
  });

  const done = useMemo(() => ({
    listening: !!progress?.listening_completed_at,
    learn: !!progress?.learn_completed_at,
    grammar: !!progress?.grammar_completed_at,
    test: !!progress?.test_completed_at,
  }), [progress]);

  const unlocked = useMemo(() => ({
    listening: true,
    learn: done.listening,
    grammar: done.listening && done.learn,
    test: done.listening && done.learn && done.grammar,
  }), [done]);

  // If the user has never made progress, keep them on Listening. If they refresh,
  // land on the first unlocked-not-yet-done tab.
  useEffect(() => {
    if (!progress) return;
    const next = TAB_ORDER.find((t) => unlocked[t] && !done[t]) ?? "test";
    setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit?.id]);

  async function markCompleted(field: keyof ProgressRow) {
    if (!user?.id || !unit?.id) return;
    const patch = { [field]: new Date().toISOString() } as Record<string, string>;
    const { error } = await (supabase as any)
      .from("flashcard_intermediate_progress")
      .upsert(
        { user_id: user.id, unit_id: unit.id, ...patch },
        { onConflict: "user_id,unit_id" }
      );
    if (error) {
      console.warn("[intermediate progress] upsert failed", error);
      return;
    }
    qc.invalidateQueries({ queryKey: ["fc-intermediate-progress", user.id, unit.id] });
  }

  function tryChangeTab(next: Tab) {
    if (!unlocked[next]) {
      const prevLabel =
        next === "learn" ? "Listening"
        : next === "grammar" ? "Learn"
        : "Grammar";
      toast({
        title: "Step locked",
        description: `Complete ${prevLabel} first.`,
      });
      return;
    }
    setActiveTab(next);
  }

  if (isLoading) {
    return (
      <Layout>
        <section className="container max-w-3xl py-6 px-4 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-full mt-4" />
          <Skeleton className="aspect-video w-full md:w-[70%] mx-auto rounded-lg" />
        </section>
      </Layout>
    );
  }
  if (error) {
    return (
      <Layout>
        <section className="container max-w-3xl py-8 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Couldn't load this lesson.</span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            </AlertDescription>
          </Alert>
        </section>
      </Layout>
    );
  }
  if (!unit) return <Layout><div className="container py-16">Unit not found.</div></Layout>;

  const canStudy = unit.is_free || hasAccess;

  const TabIcon = ({ tab, base: Icon }: { tab: Tab; base: any }) => {
    if (done[tab]) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (!unlocked[tab]) return <Lock className="w-4 h-4 text-muted-foreground" />;
    return <Icon className="w-4 h-4" />;
  };

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
          <Tabs
            value={activeTab}
            onValueChange={(v) => tryChangeTab(v as Tab)}
            className="w-full"
          >
            <div className="md:sticky md:top-16 md:z-30 -mx-4 px-4 py-2 md:bg-background/85 md:backdrop-blur md:border-b md:border-border/40">
              <TabsList className="grid w-full h-auto grid-cols-2 md:grid-cols-4">
                {([
                  { v: "listening", label: "Listening", icon: Headphones },
                  { v: "learn", label: "Learn", icon: BookOpen },
                  { v: "grammar", label: "Grammar", icon: ScrollText },
                  { v: "test", label: "Test", icon: GraduationCap },
                ] as const).map((t) => (
                  <TabsTrigger
                    key={t.v}
                    value={t.v}
                    disabled={!unlocked[t.v as Tab]}
                    className={cn(
                      "flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]",
                      !unlocked[t.v as Tab] && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <TabIcon tab={t.v as Tab} base={t.icon} />
                    <span>{t.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="listening" className="mt-3 md:mt-4">
              {canStudy ? (
                <ListeningPlayer
                  videoUrl={unit.video_url}
                  storagePath={unit.video_storage_path}
                  alreadyDone={done.listening}
                  onContinue={async () => {
                    if (!done.listening) await markCompleted("listening_completed_at");
                    setActiveTab("learn");
                  }}
                />
              ) : (
                <LockedCard icon={Headphones} title="Listening" body="Watch the lesson video and follow along with the dialogue." />
              )}
            </TabsContent>

            <TabsContent value="learn" className="mt-3 md:mt-4">
              {!unlocked.learn ? (
                <TabLocked prevLabel="Listening" />
              ) : canStudy ? (
                <LearnVocabBrowser
                  unitId={unit.id}
                  onComplete={async () => {
                    if (!done.learn) await markCompleted("learn_completed_at");
                    setActiveTab("grammar");
                  }}
                  nextLabel="Continue to Grammar"
                  nextIcon={ScrollText}
                />
              ) : (
                <LockedCard icon={BookOpen} title="Learn" body="Study each vocabulary card with Arabic, transliteration, English, image and audio." />
              )}
            </TabsContent>

            <TabsContent value="grammar" className="mt-3 md:mt-4">
              {!unlocked.grammar ? (
                <TabLocked prevLabel="Learn" />
              ) : canStudy ? (
                <GrammarBrowser
                  unitId={unit.id}
                  onComplete={async () => {
                    if (!done.grammar) await markCompleted("grammar_completed_at");
                    setActiveTab("test");
                  }}
                />
              ) : (
                <LockedCard icon={ScrollText} title="Grammar" body="Concise grammar notes with clear examples for this lesson." />
              )}
            </TabsContent>

            <TabsContent value="test" className="mt-4">
              {!unlocked.test ? (
                <TabLocked prevLabel="Grammar" />
              ) : canStudy ? (
                <IntermediateTestRunner
                  unitId={unit.id}
                  onFinished={async () => {
                    if (!done.test) await markCompleted("test_completed_at");
                  }}
                />
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
