/**
 * ArabiyaPath Unit Standard
 *
 * All units must render through this component.
 * Do not create unit-specific renderers.
 * Do not fork layouts per unit.
 *
 * Every unit inherits: Learn → Listening → Speaking → Test Yourself,
 * compact header, Back To Units, sticky tabs, shared progress,
 * capped hero images, click-image-to-play audio, completion screens,
 * minimal footer, keyboard navigation, loading skeletons, safe-area support.
 *
 * See: src/components/flashcards/msa/unitTemplate.ts
 *      docs/UNIT_STANDARD.md
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, BookOpen, Headphones, Mic, GraduationCap, ArrowLeft, ScrollText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardUnitAccess } from "@/lib/flashcardAccess";
import { LearnVocabBrowser } from "@/components/flashcards/msa/LearnVocabBrowser";
import { ListeningQuiz } from "@/components/flashcards/msa/ListeningQuiz";
import { SpeakingPractice } from "@/components/flashcards/msa/SpeakingPractice";
import { TestYourselfQuiz } from "@/components/flashcards/msa/TestYourselfQuiz";
import { GrammarBrowser } from "@/components/flashcards/msa/GrammarBrowser";

type StudyTab = "learn" | "listening" | "speaking" | "grammar" | "test";

export default function FlashCardUnit() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudyTab>("learn");
  const lessonTopRef = useRef<HTMLDivElement | null>(null);

  const scrollToLessonTop = () => {
    requestAnimationFrame(() => {
      lessonTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const goToTab = (tab: StudyTab) => {
    setActiveTab(tab);
    scrollToLessonTop();
  };


  const { data: unit, isLoading } = useQuery({
    queryKey: ["fc-unit", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,title_ar,description,is_free,cover_image_url,seo_title,seo_description")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: cardCount } = useQuery({
    queryKey: ["fc-unit-card-count", unit?.id],
    enabled: !!unit?.id,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unit!.id)
        .eq("published", true);
      return count ?? 0;
    },
  });

  const { data: hasAccess } = useFlashcardUnitAccess(unit?.id);

  // Look up a pack that contains this unit (or first published pack as fallback)
  // to power the unified-checkout redirect for locked units.
  const { data: unlockProductId } = useQuery({
    queryKey: ["fc-unit-unlock-product", unit?.id],
    enabled: !!unit?.id,
    queryFn: async () => {
      const { data: pu } = await (supabase as any)
        .from("flashcard_pack_units")
        .select("pack_id")
        .eq("unit_id", unit!.id)
        .limit(1);
      let packId = pu?.[0]?.pack_id ?? null;
      if (!packId) {
        const { data: anyPack } = await (supabase as any)
          .from("flashcard_packs")
          .select("id")
          .eq("published", true)
          .limit(1);
        packId = anyPack?.[0]?.id ?? null;
      }
      if (!packId) return null;
      const { data: pack } = await (supabase as any)
        .from("flashcard_packs")
        .select("product_id")
        .eq("id", packId)
        .maybeSingle();
      return pack?.product_id ?? null;
    },
  });

  // Grammar tab is optional per unit. It appears whenever the unit has at
  // least one published Grammar card (kind = 'grammar').
  const { data: grammarCount } = useQuery({
    queryKey: ["fc-unit-grammar-count", unit?.id],
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

  if (isLoading) return <Layout><div className="container py-16">Loading…</div></Layout>;
  if (!unit) return <Layout><div className="container py-16">Unit not found.</div></Layout>;

  const canStudy = unit.is_free || hasAccess;
  const handleStudy = () => {
    if (!user) {
      navigate(`/signup?redirect=/flashcards/study/${unit.slug}`);
      return;
    }
    navigate(`/flashcards/study/${unit.slug}`);
  };

  const unlockTarget = unlockProductId ? `/checkout?productId=${unlockProductId}` : "/flashcards";
  const unlockHref = user ? unlockTarget : `/signup?redirect=${encodeURIComponent(unlockTarget)}`;

  const showGrammar = !!grammarCount && grammarCount > 0;


  return (
    <Layout minimalFooter>
      <SEOHead
        title={unit.seo_title || `${unit.title_en} — Spoken Arabic`}
        description={unit.seo_description || unit.description || "MSA Arabic vocabulary."}
        canonicalPath={`/flashcards/unit/${unit.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: unit.title_en,
          description: unit.description,
          provider: { "@type": "Organization", name: "ArabiyaPath" },
          inLanguage: "ar",
        }}
      />
      <section className="container max-w-3xl py-4 md:py-8 px-4">
        <div className="mb-2 md:mb-3">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/flashcards');
            }
          }}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Units
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">{unit.title_en}</h1>
        {unit.title_ar && (
          <p className="text-base md:text-xl text-muted-foreground mb-1" dir="rtl" lang="ar">{unit.title_ar}</p>
        )}
        {typeof cardCount === "number" && cardCount > 0 && (
          <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {cardCount} Words
          </span>
        )}

        <div ref={lessonTopRef} className="mt-3 md:mt-4 scroll-mt-20">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StudyTab)} className="w-full">
            <div className="md:sticky md:top-16 md:z-30 -mx-4 px-4 py-2 md:bg-background/85 md:backdrop-blur md:border-b md:border-border/40">
              <TabsList
                className={`grid w-full h-auto grid-cols-2 ${showGrammar ? "md:grid-cols-5" : "md:grid-cols-4"}`}
              >
                <TabsTrigger value="learn" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <BookOpen className="w-4 h-4" /> Learn
                </TabsTrigger>
                <TabsTrigger value="listening" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <Headphones className="w-4 h-4" /> Listening
                </TabsTrigger>
                <TabsTrigger value="speaking" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <Mic className="w-4 h-4" /> Speaking
                </TabsTrigger>
                {showGrammar && (
                  <TabsTrigger value="grammar" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                    <ScrollText className="w-4 h-4" /> Grammar
                  </TabsTrigger>
                )}
                <TabsTrigger value="test" className="flex flex-col md:flex-row gap-1 md:gap-2 py-3 min-h-[44px]">
                  <GraduationCap className="w-4 h-4" /> Test Yourself
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="learn" className="mt-3 md:mt-4">
              {canStudy ? (
                <LearnVocabBrowser unitId={unit.id} onComplete={() => goToTab("listening")} />

              ) : (
                <Card>
                  <CardContent className="p-8 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Learn</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Browse each card with its Arabic word, transliteration, English meaning, image, and native audio — at your own pace.
                    </p>
                    <Button asChild className="mt-2">
                      <Link to="/pricing">
                        <Lock className="w-4 h-4 mr-2" /> Join Membership
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="listening" className="mt-3 md:mt-4">
              {canStudy ? (
                <ListeningQuiz unitId={unit.id} onComplete={() => goToTab("speaking")} />

              ) : (
                <Card>
                  <CardContent className="p-8 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Headphones className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Listening</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Play the unit's audio and follow along as each card highlights in turn.
                    </p>
                    <Button asChild className="mt-2">
                      <Link to="/pricing">
                        <Lock className="w-4 h-4 mr-2" /> Join Membership
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="speaking" className="mt-3 md:mt-4">
              {canStudy ? (
                <SpeakingPractice
                  unitId={unit.id}
                  onComplete={() => goToTab(showGrammar ? "grammar" : "test")}
                  nextTarget={showGrammar ? "grammar" : "test"}
                  nextLabel={showGrammar ? "Continue to Grammar" : "Continue to Test Yourself"}
                />


              ) : (
                <Card>
                  <CardContent className="p-8 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mic className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Speaking</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Record yourself saying each word and compare against the native audio with an AI pronunciation score.
                    </p>
                    <Button asChild className="mt-2">
                      <Link to="/pricing">
                        <Lock className="w-4 h-4 mr-2" /> Join Membership
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {showGrammar && (
              <TabsContent value="grammar" className="mt-3 md:mt-4">
                {canStudy ? (
                  <GrammarBrowser unitId={unit.id} onComplete={() => goToTab("test")} />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <ScrollText className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Grammar</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Short grammar note with clear examples in Arabic and English.
                      </p>
                      <Button asChild className="mt-2">
                        <Link to="/pricing">
                          <Lock className="w-4 h-4 mr-2" /> Join Membership
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            <TabsContent value="test" className="mt-4">
              {canStudy ? (
                <TestYourselfQuiz unitId={unit.id} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Test Yourself</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      A 10-question mixed quiz built from this unit's cards, with a final score.
                    </p>
                    <Button asChild className="mt-2">
                      <Link to="/pricing">
                        <Lock className="w-4 h-4 mr-2" /> Join Membership
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
        {/* TODO: aggregate progress across Learning / Listening / Speaking / Test once activated. */}
      </section>
    </Layout>
  );
}

