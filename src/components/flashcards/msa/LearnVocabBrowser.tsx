import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "./FlashCardImage";
import { FlashCardAudio } from "./FlashCardAudio";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isVocab } from "@/lib/cardClassify";

interface CardRow {
  id: string;
  arabic_text: string;
  english_translation: string;
  transliteration: string | null;
  example_arabic: string | null;
  image_url: string | null;
  image_alt: string | null;
  audio_url: string | null;
}

interface Slide {
  key: string;
  kind: "single" | "combined";
  arabic: string;
  english?: string;
  transliteration?: string | null;
  image_url: string | null;
  image_alt: string | null;
  audio_url: string | null; // null for combined slides
}

interface Props {
  unitId: string;
}

/**
 * Learn tab — vocabulary only.
 * Pattern: A, B, A+B, C, D, C+D, …
 * The "A + B" combined slide reuses card A's image and shows no audio
 * (admin will upload proper combined assets later).
 */
export function LearnVocabBrowser({ unitId }: Props) {
  const [idx, setIdx] = useState(0);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-learn-vocab", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select(
          "id,arabic_text,english_translation,transliteration,example_arabic,image_url,image_alt,audio_url"
        )
        .eq("unit_id", unitId)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });

  const slides: Slide[] = useMemo(() => {
    const vocab = (cards ?? []).filter(isVocab);
    const out: Slide[] = [];
    for (let i = 0; i < vocab.length; i += 2) {
      const a = vocab[i];
      const b = vocab[i + 1];
      out.push({
        key: a.id,
        kind: "single",
        arabic: a.arabic_text,
        english: a.english_translation,
        transliteration: a.transliteration,
        image_url: a.image_url,
        image_alt: a.image_alt,
        audio_url: a.audio_url,
      });
      if (b) {
        out.push({
          key: b.id,
          kind: "single",
          arabic: b.arabic_text,
          english: b.english_translation,
          transliteration: b.transliteration,
          image_url: b.image_url,
          image_alt: b.image_alt,
          audio_url: b.audio_url,
        });
        out.push({
          key: `${a.id}+${b.id}`,
          kind: "combined",
          arabic: `${a.arabic_text} وَ${b.arabic_text}`,
          image_url: a.image_url,
          image_alt: `${a.image_alt ?? ""} + ${b.image_alt ?? ""}`,
          audio_url: null,
        });
      }
    }
    return out;
  }, [cards]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">Loading cards…</CardContent>
      </Card>
    );
  }

  if (!slides.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No vocabulary cards in this unit yet.
        </CardContent>
      </Card>
    );
  }

  const total = slides.length;
  const safeIdx = Math.min(idx, total - 1);
  const current = slides[safeIdx];

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <p className="text-sm text-muted-foreground">
          Card {safeIdx + 1} of {total}
          {current.kind === "combined" && (
            <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              Combined
            </span>
          )}
        </p>

        <FlashCardImage
          src={current.image_url}
          alt={current.image_alt || current.arabic}
        />

        <div className="text-center space-y-2">
          <p className="text-3xl md:text-4xl font-bold leading-loose" dir="rtl" lang="ar">
            {current.arabic}
          </p>
          {current.kind === "single" && current.transliteration && (
            <p className="text-base md:text-lg text-muted-foreground italic">
              {current.transliteration}
            </p>
          )}
          {current.kind === "single" && current.english && (
            <p className="text-lg md:text-xl">{current.english}</p>
          )}
        </div>

        {current.kind === "single" && (
          <div className="flex justify-center">
            <FlashCardAudio
              key={`${current.key}-learn-audio`}
              src={current.audio_url}
              label="Play audio"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={safeIdx === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <Button
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            disabled={safeIdx === total - 1}
            className="gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
