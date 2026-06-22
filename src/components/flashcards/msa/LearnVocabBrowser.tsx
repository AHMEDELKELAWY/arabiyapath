import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "./FlashCardImage";
import { ActivityProgress } from "./ActivityProgress";
import { ChevronLeft, ChevronRight, Volume2, Check, RotateCcw, ArrowLeft, Headphones } from "lucide-react";
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
 * Learn tab — pure manually authored vocabulary browser.
 * Reads only flashcards where kind = 'learn'.
 */
export function LearnVocabBrowser({ unitId }: Props) {
  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-learn-cards", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("id,arabic_text,english_translation,transliteration,image_url,image_alt,audio_url")
        .eq("unit_id", unitId)
        .eq("kind", "learn")
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });

  const total = cards?.length ?? 0;
  const safeIdx = total > 0 ? Math.min(idx, total - 1) : 0;
  const current = cards?.[safeIdx];

  useEffect(() => {
    setFadeKey((k) => k + 1);
  }, [safeIdx]);

  const playAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (safeIdx >= total - 1) {
      setCompleted(true);
    } else {
      setIdx((i) => i + 1);
    }
  };

  // Keyboard nav (desktop)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (completed) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "Enter") { e.preventDefault(); playAudio(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdx, total, completed]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="h-2 w-full rounded bg-muted animate-pulse" />
          <div className="aspect-[4/3] w-full max-w-[333px] md:max-w-[667px] mx-auto rounded-2xl bg-muted animate-pulse" />
          <div className="h-8 w-1/2 mx-auto rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/3 mx-auto rounded bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!cards?.length) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-6 md:p-8 text-center text-muted-foreground">
          No Learn cards yet.
        </CardContent>
      </Card>
    );
  }

  if (completed) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
            <Check className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold">Unit Completed</h3>
          <p className="text-muted-foreground">You finished all cards in this lesson.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-center pt-2">
            <Button variant="ghost" onClick={() => navigate(slug ? `/flashcards` : "/flashcards")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back To Units
            </Button>
            <Button variant="outline" onClick={() => { setCompleted(false); setIdx(0); }} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Review Again
            </Button>
            <Button onClick={() => { setCompleted(false); setIdx(0); /* tab switch hint */ }} className="gap-2">
              <Headphones className="w-4 h-4" /> Go To Listening
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-1">Tip: tap the Listening tab above to continue.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 md:p-8 space-y-4">
        <ActivityProgress current={safeIdx + 1} total={total} label="Card" />

        {current && (
          <div key={fadeKey} className="space-y-4 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={playAudio}
              disabled={!current.audio_url}
              aria-label="Play audio"
              className="relative block mx-auto w-full max-w-[333px] md:max-w-[667px] group focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl"
            >
              <FlashCardImage
                src={current.image_url}
                alt={current.image_alt || current.arabic_text}
                capped
              />
              {current.audio_url && (
                <span className="pointer-events-none absolute bottom-3 right-3 bg-background/85 backdrop-blur rounded-full p-2 shadow-sm border border-border/60 transition-transform group-hover:scale-110">
                  <Volume2 className="w-4 h-4 text-primary" />
                </span>
              )}
            </button>

            <div className="text-center space-y-2">
              <p
                className="text-4xl md:text-5xl font-bold leading-loose break-words"
                dir="rtl"
                lang="ar"
              >
                {current.arabic_text}
              </p>
              {current.transliteration && (
                <p className="text-base md:text-lg italic text-muted-foreground">
                  {current.transliteration}
                </p>
              )}
              {current.english_translation && (
                <p className="text-base md:text-lg">{current.english_translation}</p>
              )}
            </div>

            <audio ref={audioRef} src={current.audio_url ?? undefined} preload="auto" />

            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={playAudio}
                disabled={!current.audio_url}
                className="gap-2 min-h-[44px]"
              >
                <Volume2 className="w-4 h-4" /> Play Audio
              </Button>
            </div>

            <div
              className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <Button
                variant="ghost"
                onClick={goPrev}
                disabled={safeIdx === 0}
                className="gap-1 sm:w-auto min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button
                onClick={goNext}
                className={cn("gap-1 w-full sm:w-auto min-h-[44px]")}
              >
                {safeIdx === total - 1 ? "Finish" : "Next"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
