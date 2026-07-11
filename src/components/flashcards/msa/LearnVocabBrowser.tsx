import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "./FlashCardImage";
import { ActivityProgress } from "./ActivityProgress";
import { ChevronLeft, ChevronRight, Volume2, Check, RotateCcw, ArrowLeft, Mic, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEARN_KIND } from "./unitTemplate";
import { useAuth } from "@/contexts/AuthContext";
import { saveSpokenArabicResume, loadSpokenArabicResume } from "@/lib/spokenArabicResume";
import { markCardsReviewed } from "@/lib/flashcards/markReviewed";

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
  onComplete?: () => void;
}

/**
 * Learn tab — pure manually authored vocabulary browser.
 * Reads only flashcards where kind = 'learn'.
 */
export function LearnVocabBrowser({ unitId, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-learn-cards", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("id,arabic_text,english_translation,transliteration,image_url,image_alt,audio_url")
        .eq("unit_id", unitId)
        .eq("kind", LEARN_KIND)
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

  // Hydrate the exact card position from the saved resume state (DB → cache).
  useEffect(() => {
    if (hydratedRef.current || !slug || total === 0) return;
    hydratedRef.current = true;
    const saved = loadSpokenArabicResume();
    if (saved?.unitSlug === slug && saved.tab === "learn" && typeof saved.cardIndex === "number") {
      const clamped = Math.min(Math.max(saved.cardIndex, 0), total - 1);
      if (clamped > 0) setIdx(clamped);
    }
  }, [slug, total]);

  // Persist exact card position so Resume Learning restores it.
  useEffect(() => {
    if (!slug || total === 0) return;
    saveSpokenArabicResume(
      { unitSlug: slug, tab: "learn", cardIndex: safeIdx },
      user?.id ?? null
    );
  }, [slug, safeIdx, total, user?.id]);

  const playAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const finishActivity = () => {
    setCompleted(true);
    void markCardsReviewed(user?.id, (cards ?? []).map((c) => c.id), queryClient);
  };

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (safeIdx >= total - 1) {
      finishActivity();
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
        <CardContent className="p-5 md:p-8 space-y-4">
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
        <CardContent className="p-5 md:p-8 text-center text-muted-foreground">
          No Learn cards yet.
        </CardContent>
      </Card>
    );
  }

  if (completed) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-5 md:p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
            <Check className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold">Learn Complete</h3>
          <p className="text-muted-foreground">You finished all cards in this lesson.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-center pt-2">
            <Button variant="ghost" onClick={() => navigate('/flashcards')} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back To Units
            </Button>
            <Button variant="outline" onClick={() => { setCompleted(false); setIdx(0); }} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Review Again
            </Button>
            <Button
              onClick={() => {
                setCompleted(false);
                setIdx(0);
                onComplete?.();
              }}
              className="gap-2"
            >
              <Headphones className="w-4 h-4" /> Continue to Listening
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isFirst = safeIdx === 0;
  const isLast = safeIdx === total - 1;

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5 space-y-3">
        <ActivityProgress current={safeIdx + 1} total={total} label="Card" />

        {current && (
          <div key={fadeKey} className="space-y-3 animate-in fade-in duration-200">
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

            <div className="text-center space-y-1">
              <p
                className="text-3xl md:text-4xl font-bold leading-snug md:leading-snug break-words"
                dir="rtl"
                lang="ar"
              >
                {current.arabic_text}
              </p>
              {current.transliteration && (
                <p className="text-sm md:text-base italic text-muted-foreground">
                  {current.transliteration}
                </p>
              )}
              {current.english_translation && (
                <p className="text-sm md:text-base">{current.english_translation}</p>
              )}
            </div>

            <audio ref={audioRef} src={current.audio_url ?? undefined} preload="none" />

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
              className="flex flex-row justify-between gap-2 pt-2"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <Button
                variant="outline"
                onClick={goPrev}
                className={cn(
                  "gap-1 flex-1 min-h-[44px]",
                  isFirst && "invisible"
                )}
                aria-hidden={isFirst}
                tabIndex={isFirst ? -1 : 0}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button
                onClick={goNext}
                className="gap-1 flex-1 min-h-[44px]"
              >
                {isLast ? "Finish" : "Next"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
