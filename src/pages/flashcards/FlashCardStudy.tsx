import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FlashCardImage } from "@/components/flashcards/msa/FlashCardImage";
import { FlashCardAudio } from "@/components/flashcards/msa/FlashCardAudio";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
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

export default function FlashCardStudy() {
  const { unitSlug } = useParams<{ unitSlug: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

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

  const { data: cards } = useQuery({
    queryKey: ["fc-study-cards", unit?.id],
    enabled: !!unit?.id,
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
      toast({ title: "Session complete!", description: "Great work." });
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

  if (!cards?.length) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">No cards in this unit yet.</p>
        </div>
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
            <Link to={`/flashcards/unit/${unit.slug}`}>Exit</Link>
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
