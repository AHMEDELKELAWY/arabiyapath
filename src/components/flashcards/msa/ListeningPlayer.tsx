import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "./FlashCardImage";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { cn } from "@/lib/utils";

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
 * Listening mode — plays each card's audio sequentially and highlights the
 * currently playing card. Users can play/pause, skip, or jump to a card.
 */
export function ListeningPlayer({ unitId }: Props) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-listening-cards", unitId],
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

  const total = cards?.length ?? 0;
  const safeIdx = total > 0 ? Math.min(idx, total - 1) : 0;
  const current = cards?.[safeIdx];

  // Reload audio when the current card changes; resume playback if we were playing.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    a.pause();
    a.currentTime = 0;
    if (playing && current.audio_url) {
      a.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !current?.audio_url) return;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const goTo = (next: number) => {
    if (total === 0) return;
    setIdx(Math.max(0, Math.min(total - 1, next)));
  };

  const handleEnded = () => {
    if (autoAdvance && safeIdx + 1 < total) {
      setIdx(safeIdx + 1);
      // playing stays true → effect will autoplay next card
    } else {
      setPlaying(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">Loading audio…</CardContent>
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

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Now-playing card */}
        {current && (
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <FlashCardImage
              src={current.image_url}
              alt={current.image_alt || current.english_translation}
            />
            <div className="text-center md:text-left space-y-2">
              <p className="text-3xl md:text-4xl font-bold leading-loose" dir="rtl" lang="ar">
                {current.arabic_text}
              </p>
              {current.transliteration && (
                <p className="text-base text-muted-foreground italic">{current.transliteration}</p>
              )}
              <p className="text-lg">{current.english_translation}</p>
            </div>
          </div>
        )}

        {/* Hidden audio element drives playback */}
        <audio
          ref={audioRef}
          src={current?.audio_url ?? undefined}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={handleEnded}
        />

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(safeIdx - 1)}
            disabled={safeIdx === 0}
            aria-label="Previous"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            onClick={togglePlay}
            disabled={!current?.audio_url}
            className="gap-2"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(safeIdx + 1)}
            disabled={safeIdx === total - 1}
            aria-label="Next"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="accent-primary"
          />
          Auto-play next card
        </label>

        {/* Card list — highlight currently playing */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">
            Card {safeIdx + 1} of {total}
          </p>
          <ul className="max-h-64 overflow-y-auto divide-y rounded-lg border bg-background">
            {cards.map((c, i) => {
              const isActive = i === safeIdx;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      {isActive && playing ? (
                        <span className="block w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <span className="truncate font-medium" dir="rtl" lang="ar">
                        {c.arabic_text}
                      </span>
                      <span className="truncate text-xs hidden sm:inline">
                        {c.english_translation}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
