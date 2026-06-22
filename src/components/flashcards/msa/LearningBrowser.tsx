import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "./FlashCardImage";
import { FlashCardAudio } from "./FlashCardAudio";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CardRow {
  id: string;
  arabic_text: string;
  english_translation: string;
  transliteration: string | null;
  image_url: string | null;
  image_alt: string | null;
  audio_url: string | null;
}

interface Props {
  unitId: string;
}

/**
 * Learning mode — browse cards at your own pace.
 * Shows Arabic text, transliteration, English translation, image, and audio
 * all at once. No SRS, no rating buttons.
 */
export function LearningBrowser({ unitId }: Props) {
  const [idx, setIdx] = useState(0);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-learning-cards", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("id,arabic_text,english_translation,transliteration,image_url,image_alt,audio_url")
        .eq("unit_id", unitId)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">Loading cards…</CardContent>
      </Card>
    );
  }

  if (!cards?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No cards in this unit yet.
        </CardContent>
      </Card>
    );
  }

  const total = cards.length;
  const safeIdx = Math.min(idx, total - 1);
  const current = cards[safeIdx];

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Card {safeIdx + 1} of {total}
          </p>
        </div>

        <FlashCardImage
          src={current.image_url}
          alt={current.image_alt || current.english_translation}
        />

        <div className="text-center space-y-2">
          <p className="text-3xl md:text-4xl font-bold leading-loose" dir="rtl" lang="ar">
            {current.arabic_text}
          </p>
          {current.transliteration && (
            <p className="text-base md:text-lg text-muted-foreground italic">
              {current.transliteration}
            </p>
          )}
          <p className="text-lg md:text-xl">{current.english_translation}</p>
        </div>

        <div className="flex justify-center">
          <FlashCardAudio
            key={`${current.id}-learning-audio`}
            src={current.audio_url}
            label="Play audio"
          />
        </div>

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
