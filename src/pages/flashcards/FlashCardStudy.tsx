import { useEffect, useRef, useState } from "react";
import { useParams, Link, Navigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "@/components/flashcards/msa/FlashCardImage";
import { FlashCardAudio } from "@/components/flashcards/msa/FlashCardAudio";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardUnitAccess } from "@/lib/flashcardAccess";
import { toast } from "@/hooks/use-toast";
import { Lock, Check, Sparkles, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Rating = "again" | "hard" | "good" | "easy";

interface CardRow {
  id: string;
  unit_id: string;
  arabic_text: string;
  english_translation: string;
  transliteration: string | null;
  example_arabic: string | null;
  example_english: string | null;
  image_url: string | null;
  image_alt: string | null;
  audio_url: string | null;
  audio_example_url: string | null;
}

function resolveSource(state: unknown, search: string): "dashboard" | "home" {
  const fromState = (state as { from?: string } | null)?.from;
  if (fromState === "dashboard") return "dashboard";
  if (fromState === "home") return "home";

  const params = new URLSearchParams(search);
  const fromQuery = params.get("from");
  if (fromQuery === "dashboard") return "dashboard";
  if (fromQuery === "home") return "home";

  if (typeof document !== "undefined" && document.referrer) {
    try {
      const url = new URL(document.referrer);
      if (url.pathname.includes("/dashboard")) return "dashboard";
    } catch {
      /* ignore */
    }
  }
  return "home";
}

export default function FlashCardStudy() {
  const { unitSlug } = useParams<{ unitSlug: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const location = useLocation();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Resolve the session source ONCE and keep it stable for the entire session,
  // even across card-to-card navigation. The ref is never reassigned.
  const sourceRef = useRef<"dashboard" | "home">(
    resolveSource(location.state, location.search)
  );
  const exitHref = sourceRef.current === "dashboard" ? "/dashboard" : "/flashcards";

  const { data: unit } = useQuery({
    queryKey: ["fc-unit-by-slug", unitSlug],
    enabled: !!unitSlug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,is_free")
        .eq("slug", unitSlug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: access, isLoading: accessLoading } = useFlashcardUnitAccess(unit?.id);

  // For locked-unit deep links and free-unit completion upsell, look up the
  // pack product so we can redirect straight to the unified checkout.
  const { data: unlockProductId } = useQuery({
    queryKey: ["fc-study-unlock-product", unit?.id],
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

  const { data: cards } = useQuery({
    queryKey: ["fc-study-cards", unit?.id],
    enabled: !!unit?.id && (unit?.is_free || access === true),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("id,unit_id,arabic_text,english_translation,transliteration,example_arabic,example_english,image_url,image_alt,audio_url,audio_example_url")
        .eq("unit_id", unit!.id)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });

  const current = cards?.[idx];
  const total = cards?.length ?? 0;

  useEffect(() => {
    setFlipped(false);
  }, [idx, current?.id]);

  useEffect(() => {
    if (unit?.id && total > 0 && idx === 0) {
      trackEvent("flashcard_study_start", { unit_id: unit.id, unit_slug: unit.slug, total_cards: total });
    }
  }, [unit?.id, total]);

  const rate = async (knewIt: boolean) => {
    const rating: Rating = knewIt ? "good" : "again";
    if (!current) return;
    if (!user) {
      toast({ title: "Please sign in to track progress." });
      return;
    }
    const { error } = await (supabase.rpc as any)("fc_apply_review", {
      _card_id: current.id,
      _rating: rating,
    });
    if (error) {
      toast({ title: "Couldn't save review", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["fc-dashboard"] });
    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      trackEvent("flashcard_unit_complete", { unit_id: unit?.id, unit_slug: unit?.slug, total_cards: total });
      setCompleted(true);
    }
  };

  if (!unit) return <Layout><div className="container py-16">Loading…</div></Layout>;

  if (!user) {
    return (
      <Layout>
        <div className="container max-w-md py-16 text-center">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Sign in to study</h1>
          <Button asChild>
            <Link to={`/signup?redirect=/flashcards/study/${unitSlug}`}>Sign up free</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // Locked deep link → redirect straight to unified checkout (no pack page).
  if (!unit.is_free && access === false && !accessLoading) {
    if (unlockProductId) {
      return <Navigate to={`/checkout?productId=${unlockProductId}`} replace />;
    }
    return <Navigate to="/flashcards" replace />;
  }

  if (!cards?.length) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">No cards in this unit yet.</p>
        </div>
      </Layout>
    );
  }

  // Free unit just completed and user has no pack access → conversion screen.
  if (completed && unit.is_free && access !== true) {
    const upgradeHref = unlockProductId ? `/checkout?productId=${unlockProductId}` : "/flashcards";
    const benefits = [
      "500+ Arabic flashcards",
      "Native Arabic audio pronunciation",
      "Realistic image-based learning",
      "Full Arabic vowelization (Tashkeel)",
      "Smart spaced repetition reviews",
      "Vocabulary from real conversations",
      "Progress tracking and learning streaks",
    ];
    return (
      <Layout>
        <SEOHead title={`Completed — ${unit.title_en}`} noindex />
        <section className="container max-w-2xl py-12 px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Congratulations!</h1>
              <p className="text-muted-foreground mb-6">
                You completed the free flashcard unit.
              </p>
              <p className="font-semibold mb-3">
                Unlock the complete Flash Cards Pack and get access to:
              </p>
              <ul className="text-left max-w-sm mx-auto space-y-2 mb-8 text-sm">
                {benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full gap-2" asChild>
                  <Link to={upgradeHref}>
                    Unlock Full Pack
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link to={exitHref}>Back to {sourceRef.current === "dashboard" ? "Dashboard" : "Flash Cards"}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </Layout>
    );
  }

  // Paid user just completed the unit → simple congrats with exit back to source.
  if (completed) {
    return (
      <Layout>
        <SEOHead title={`Completed — ${unit.title_en}`} noindex />
        <section className="container max-w-md py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Session complete!</h1>
          <p className="text-muted-foreground mb-6">Great work.</p>
          <Button size="lg" asChild>
            <Link to={exitHref}>Back to {sourceRef.current === "dashboard" ? "Dashboard" : "Flash Cards"}</Link>
          </Button>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title={`Study — ${unit.title_en}`}
        canonicalPath={`/flashcards/study/${unit.slug}`}
        noindex
      />
      <section className="container max-w-2xl py-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Card {idx + 1} of {total}
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link to={exitHref}>Exit</Link>
          </Button>
        </div>

        {current && (
          <>
            {/* Flip card */}
            <div
              className="relative w-full aspect-[4/3]"
              style={{ perspective: "1200px" }}
            >
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-label={flipped ? "Show image" : "Reveal answer"}
                className={cn(
                  "relative w-full h-full transition-transform duration-500 ease-out rounded-2xl",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front — image only */}
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                >
                  <FlashCardImage
                    src={current.image_url}
                    alt={current.image_alt || "Flash card"}
                    className="h-full w-full aspect-auto"
                  />
                </div>

                {/* Back — Arabic, English, audio */}
                <div
                  className="absolute inset-0 rounded-2xl border bg-card shadow-xl flex flex-col items-center justify-center p-6 text-center gap-4"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <p className="text-4xl md:text-5xl font-bold leading-loose" dir="rtl" lang="ar">
                    {current.arabic_text}
                  </p>
                  <p className="text-xl text-muted-foreground">
                    {current.english_translation}
                  </p>
                  {flipped && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <FlashCardAudio
                        key={`${current.id}-audio`}
                        src={current.audio_url}
                        label="Play audio"
                      />
                    </div>
                  )}

                </div>
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-3">
              {flipped ? "Tap card to flip back" : "Tap image to reveal"}
            </p>

            {/* Assessment */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                size="lg"
                variant="destructive"
                disabled={!flipped}
                onClick={() => rate(false)}
              >
                ❌ I Didn't Know It
              </Button>
              <Button
                size="lg"
                disabled={!flipped}
                onClick={() => rate(true)}
              >
                ✅ I Knew It
              </Button>
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}
