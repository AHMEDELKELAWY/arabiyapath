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
import { useState, useEffect, useMemo, useRef } from "react";
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
import { logUnitEvent, type UnitStep } from "@/lib/unitAnalytics";


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

const REQUIRED_WATCH_PCT = 0.9;
const YT_API_SRC = "https://www.youtube.com/iframe_api";

// Global promise so we only inject the YT IFrame API script once.
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeAPI(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      try { prev && prev(); } catch { /* noop */ }
      resolve(w.YT);
    };
    if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = YT_API_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return id;
      const shorts = u.pathname.match(/\/shorts\/([\w-]+)/);
      if (shorts) return shorts[1];
      const embed = u.pathname.match(/\/embed\/([\w-]+)/);
      if (embed) return embed[1];
    }
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
  } catch { /* fall through */ }
  return null;
}

function ListeningPlayer({
  videoUrl, storagePath, alreadyDone, onContinue, userId, unitId,
}: {
  videoUrl: string | null;
  storagePath: string | null;
  alreadyDone: boolean;
  onContinue: () => void;
  userId: string | null;
  unitId: string | null;
}) {
  const [watchedPct, setWatchedPct] = useState(alreadyDone ? 1 : 0);
  const [ended, setEnded] = useState(alreadyDone);
  const [manualOverride, setManualOverride] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const endedLoggedRef = useRef(false);

  const unlocked = alreadyDone || ended || manualOverride || watchedPct >= REQUIRED_WATCH_PCT;
  const youTubeId = videoUrl && !storagePath ? extractYouTubeId(videoUrl) : null;

  // Show the manual "I've watched the video" fallback after 15s in case the
  // YT IFrame API is blocked (some mobile browsers / privacy modes).
  useEffect(() => {
    if (storagePath || !youTubeId) return;
    const t = window.setTimeout(() => setShowManual(true), 15000);
    return () => window.clearTimeout(t);
  }, [youTubeId, storagePath]);

  // Log video progress + ended (throttled inside logUnitEvent).
  useEffect(() => {
    if (!userId || !unitId) return;
    logUnitEvent({
      userId, unitId,
      eventType: "video_progress",
      step: "listening",
      watchedPct: watchedPct * 100,
    });
  }, [watchedPct, userId, unitId]);

  useEffect(() => {
    if (!ended || endedLoggedRef.current || !userId || !unitId) return;
    endedLoggedRef.current = true;
    logUnitEvent({
      userId, unitId,
      eventType: "video_ended",
      step: "listening",
      watchedPct: 100,
    });
  }, [ended, userId, unitId]);

  // Native <video> tracking.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (!v.duration) return;
      setWatchedPct(v.currentTime / v.duration);
    };
    const onEnded = () => setEnded(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [storagePath]);

  // YouTube IFrame Player API tracking (official).
  useEffect(() => {
    if (!youTubeId || !ytContainerRef.current) return;
    let cancelled = false;
    let pollId: number | null = null;

    loadYouTubeAPI()
      .then((YT: any) => {
        if (cancelled || !ytContainerRef.current) return;
        const origin = window.location.origin;
        ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
          videoId: youTubeId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              pollId = window.setInterval(() => {
                const p = ytPlayerRef.current;
                if (!p || typeof p.getCurrentTime !== "function") return;
                try {
                  const dur = p.getDuration?.() ?? 0;
                  const cur = p.getCurrentTime?.() ?? 0;
                  if (dur > 0) {
                    const pct = cur / dur;
                    setWatchedPct((prev) => (pct > prev ? pct : prev));
                  }
                } catch { /* noop */ }
              }, 1000);
            },
            onStateChange: (e: any) => {
              // 0 = ended
              if (e?.data === 0) setEnded(true);
            },
          },
        });
      })
      .catch(() => { /* fallback = manual button appears after 15s */ });

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      try { ytPlayerRef.current?.destroy?.(); } catch { /* noop */ }
      ytPlayerRef.current = null;
    };
  }, [youTubeId]);

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

  const pctShown = Math.min(100, Math.round(watchedPct * 100));

  return (
    <div className="space-y-4">
      <div className="mx-auto w-full md:w-[70%] max-w-[720px]">
        {storagePath ? (
          <video
            ref={videoRef}
            src={supabase.storage.from(CONTENT_BUCKET).getPublicUrl(storagePath).data.publicUrl}
            controls
            playsInline
            className="w-full rounded-lg border max-h-[60vh] bg-black"
          />
        ) : youTubeId ? (
          <div className="rounded-lg border overflow-hidden aspect-video bg-muted max-h-[60vh]">
            <div ref={ytContainerRef} className="w-full h-full" />
          </div>
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
      <div className="text-center text-xs text-muted-foreground">
        {unlocked
          ? "You can now continue to Learn."
          : `Watch at least 90% of the video to unlock Learn (${pctShown}%).`}
      </div>
      {!unlocked && showManual && !storagePath && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setManualOverride(true)}
            className="text-xs text-primary underline underline-offset-2"
          >
            I've finished watching — unlock Learn
          </button>
        </div>
      )}
      <div className="flex justify-center">
        <Button
          onClick={onContinue}
          disabled={!unlocked}
          className="gap-1 min-h-[44px]"
        >
          {alreadyDone ? "Continue to Learn" : "Continue to Learn"}
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
        .select("id,slug,title_en,title_ar,description,is_free,video_url,video_storage_path,seo_title,seo_description,order_index,course_level_id")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: nextUnit } = useQuery({
    queryKey: ["fc-intermediate-next-unit", unit?.id],
    enabled: !!unit?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,order_index")
        .eq("published", true)
        .eq("course_level_id", unit!.course_level_id)
        .gt("order_index", unit!.order_index)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: hasAccess } = useFlashcardUnitAccess(unit?.id);

  // Count published Grammar cards in this unit — if none exist, Grammar is
  // treated as auto-completed so it can never permanently block Test.
  const { data: grammarCount } = useQuery({
    queryKey: ["fc-intermediate-grammar-count", unit?.id],
    enabled: !!unit?.id,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unit!.id)
        .eq("kind", "grammar")
        .eq("published", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

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

  const hasGrammar = (grammarCount ?? 0) > 0;

  const done = useMemo(() => ({
    listening: !!progress?.listening_completed_at,
    learn: !!progress?.learn_completed_at,
    // If the unit has no Grammar cards, treat Grammar as done so it never
    // permanently blocks Test. DB-persisted completion still wins when present.
    grammar: !!progress?.grammar_completed_at || !hasGrammar,
    test: !!progress?.test_completed_at,
  }), [progress, hasGrammar]);

  const unlocked = useMemo(() => ({
    listening: true,
    learn: done.listening,
    grammar: done.listening && done.learn && hasGrammar,
    test: done.listening && done.learn && done.grammar,
  }), [done, hasGrammar]);

  // If the user has never made progress, keep them on Listening. If they refresh,
  // land on the first unlocked-not-yet-done tab.
  useEffect(() => {
    if (!progress) return;
    const order = TAB_ORDER.filter((t) => !(t === "grammar" && !hasGrammar));
    const next = order.find((t) => unlocked[t] && !done[t]) ?? "test";
    setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit?.id, hasGrammar]);


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
    const stepMap: Record<string, UnitStep> = {
      listening_completed_at: "listening",
      learn_completed_at: "learn",
      grammar_completed_at: "grammar",
      test_completed_at: "test",
    };
    const step = stepMap[field as string];
    if (step) {
      void logUnitEvent({
        userId: user.id,
        unitId: unit.id,
        eventType: "step_completed",
        step,
      });
    }
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
      <section className="container max-w-3xl py-3 md:py-8 px-4">
        <div className="mb-1 md:mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 md:h-9"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/flashcards/level/intermediate");
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Units
          </Button>
        </div>
        <h1 className="text-xl md:text-3xl font-bold mb-0.5 md:mb-1 leading-tight">{unit.title_en}</h1>
        {unit.title_ar && (
          <p className="text-sm md:text-xl text-muted-foreground mb-1" dir="rtl" lang="ar">
            {unit.title_ar}
          </p>
        )}

        <div className="mt-2 md:mt-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => tryChangeTab(v as Tab)}
            className="w-full"
          >
            <div className="sticky top-12 md:top-16 z-30 -mx-4 px-4 py-2 bg-background/90 backdrop-blur border-b border-border/40">
              <TabsList className={cn("grid w-full h-auto grid-cols-2", hasGrammar ? "md:grid-cols-4" : "md:grid-cols-3")}>
                {([
                  { v: "listening", label: "Listening", icon: Headphones },
                  { v: "learn", label: "Learn", icon: BookOpen },
                  ...(hasGrammar ? [{ v: "grammar", label: "Grammar", icon: ScrollText }] : []),
                  { v: "test", label: "Test", icon: GraduationCap },
                ] as const).map((t) => (
                  <TabsTrigger
                    key={t.v}
                    value={t.v}
                    disabled={!unlocked[t.v as Tab]}
                    className={cn(
                      "flex flex-row md:flex-row gap-1.5 md:gap-2 py-2 md:py-3 min-h-[40px] md:min-h-[44px] text-xs md:text-sm",
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
                  userId={user?.id ?? null}
                  unitId={unit.id}
                  onContinue={async () => {
                    if (user?.id) {
                      void logUnitEvent({
                        userId: user.id, unitId: unit.id,
                        eventType: "continue_click", step: "listening",
                      });
                    }
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
                    setActiveTab(hasGrammar ? "grammar" : "test");
                  }}
                  nextLabel={hasGrammar ? "Continue to Grammar" : "Continue to Test"}
                  nextIcon={hasGrammar ? ScrollText : GraduationCap}
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
                  nextUnitSlug={nextUnit?.slug ?? null}
                  nextUnitTitle={nextUnit?.title_en ?? null}
                  onReviewUnit={() => setActiveTab("listening")}
                  onPassed={async () => {
                    if (!done.test) await markCompleted("test_completed_at");
                    if (nextUnit?.slug) {
                      navigate(`/flashcards/intermediate/unit/${nextUnit.slug}`);
                    } else {
                      navigate("/flashcards/level/intermediate");
                    }
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
