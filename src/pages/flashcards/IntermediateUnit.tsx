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
import { ArrowLeft, Lock, BookOpen, Headphones, GraduationCap, ScrollText, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardUnitAccess } from "@/lib/flashcardAccess";
import { LearnVocabBrowser } from "@/components/flashcards/msa/LearnVocabBrowser";
import { GrammarBrowser } from "@/components/flashcards/msa/GrammarBrowser";
import { IntermediateTestRunner } from "@/components/flashcards/msa/IntermediateTestRunner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

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
  if (!storagePath && !videoUrl) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No video has been added to this lesson yet.
      </p>
    );
  }
  return (
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
  );
}

/* Legacy inline TestRunner removed — replaced by IntermediateTestRunner. */

export default function IntermediateUnit() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
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
                <LearnVocabBrowser
                  unitId={unit.id}
                  onComplete={() => setActiveTab("grammar")}
                  nextLabel="Continue to Grammar"
                  nextIcon={ScrollText}
                />

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
                <IntermediateTestRunner unitId={unit.id} />
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
