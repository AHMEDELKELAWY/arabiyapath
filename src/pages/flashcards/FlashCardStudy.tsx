import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "@/components/flashcards/msa/FlashCardImage";
import { FlashCardAudio } from "@/components/flashcards/msa/FlashCardAudio";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

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
  const [revealed, setRevealed] = useState(false);

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
    setRevealed(false);
  }, [idx, current?.id]);

  // Fire flashcard_study_start once per unit session
  useEffect(() => {
    if (unit?.id && total > 0 && idx === 0) {
      trackEvent("flashcard_study_start", { unit_id: unit.id, unit_slug: unit.slug, total_cards: total });
    }
  }, [unit?.id, total]);

  const rate = async (rating: Rating) => {
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
          <Card>
            <CardContent className="p-6 space-y-4">
              <FlashCardImage src={current.image_url} alt={current.image_alt || current.english_translation} />

              {/* Audio auto-plays once on card open */}
              <FlashCardAudio src={current.audio_url} autoPlay label="Replay audio" />

              {!revealed ? (
                <Button className="w-full" size="lg" onClick={() => setRevealed(true)}>
                  Show answer
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl md:text-4xl font-bold leading-loose" dir="rtl" lang="ar">
                      {current.arabic_text}
                    </p>
                    {/* Transliteration intentionally hidden from learners (stored for internal use only) */}
                    <p className="text-lg mt-2">{current.english_translation}</p>
                  </div>

                  {current.example_arabic && (
                    <div className="rounded-lg bg-muted/40 p-4">
                      <p className="text-lg" dir="rtl" lang="ar">{current.example_arabic}</p>
                      <p className="text-sm text-muted-foreground italic mt-1">
                        {current.example_english}
                      </p>
                      {current.audio_example_url && (
                        <FlashCardAudio
                          src={current.audio_example_url}
                          label="Replay example"
                          className="mt-2"
                        />
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <Button variant="destructive" onClick={() => rate("again")}>Again</Button>
                    <Button variant="outline" onClick={() => rate("hard")}>Hard</Button>
                    <Button onClick={() => rate("good")}>Good</Button>
                    <Button variant="secondary" onClick={() => rate("easy")}>Easy</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </Layout>
  );
}
