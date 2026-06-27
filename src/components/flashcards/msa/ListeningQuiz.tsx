import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Check, X, RotateCcw, GraduationCap, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { sentenceAudio, sentenceText, shuffle } from "@/lib/cardClassify";
import { ActivityProgress } from "./ActivityProgress";
import { LISTENING_SOURCE_KINDS } from "./unitTemplate";

interface CardRow {
  id: string;
  arabic_text: string;
  english_translation: string | null;
  example_arabic: string | null;
  example_english: string | null;
  image_url: string | null;
  image_alt: string | null;
  audio_url: string | null;
  audio_example_url: string | null;
}

interface Prompt {
  id: string;
  audio: string;
  text: string;
  correctImage: string;
  correctAlt: string;
  choices: { image: string; alt: string; correct: boolean }[];
}

interface Props {
  unitId: string;
  onComplete?: () => void;
}

export function ListeningQuiz({ unitId, onComplete }: Props) {

  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-listening-quiz", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select(
          "id,arabic_text,english_translation,example_arabic,example_english,image_url,image_alt,audio_url,audio_example_url"
        )
        .eq("unit_id", unitId)
        .in("kind", LISTENING_SOURCE_KINDS as unknown as string[])
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });

  const prompts: Prompt[] = useMemo(() => {
    // Pool from BOTH kinds. Any card with an image and any usable audio
    // (sentence audio if present, otherwise main audio) is a valid prompt.
    const pool = (cards ?? []).filter(
      (c) => c.image_url && sentenceAudio(c)
    );
    if (pool.length < 3) return [];
    const ordered = shuffle(pool);
    return ordered.map((c) => {
      const distractors = shuffle(
        pool.filter((d) => d.image_url !== c.image_url)
      ).slice(0, 2);
      const choices = shuffle(
        [c, ...distractors].map((d) => ({
          image: d.image_url!,
          alt: d.image_alt || d.english_translation || "",
          correct: d.id === c.id,
        }))
      );
      return {
        id: c.id,
        audio: sentenceAudio(c)!,
        text: sentenceText(c),
        correctImage: c.image_url!,
        correctAlt: c.image_alt || "",
        choices,
      };
    });
  }, [cards]);

  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset round when unit changes
  useEffect(() => {
    setI(0); setScore(0); setPicked(null); setDone(false);
  }, [unitId]);

  // Reset per-question state and auto-play sentence when current question changes
  useEffect(() => {
    setPicked(null);
    const a = audioRef.current;
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => {});
    }
  }, [i, prompts.length]);

  if (isLoading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card>;
  }

  if (!prompts.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Not enough cards with audio and images in this unit yet for a listening quiz.
        </CardContent>
      </Card>
    );
  }

  const total = prompts.length;

  if (done) {
    const pct = Math.round((score / total) * 100);
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-5 md:p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold">Listening Complete</h3>
          <p className="text-lg">Score: {score} / {total} ({pct}%)</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-center pt-2">
            <Button variant="outline" onClick={() => { setI(0); setScore(0); setPicked(null); setDone(false); }} className="gap-2 min-h-[44px]">
              <RotateCcw className="w-4 h-4" /> Restart
            </Button>
            <Button
              onClick={() => { setI(0); setScore(0); setPicked(null); setDone(false); onComplete?.(); }}
              className="gap-2 min-h-[44px]"
            >
              <Mic className="w-4 h-4" /> Continue to Speaking
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }


  const q = prompts[i];

  const replay = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const pick = (n: number) => {
    if (picked !== null && q.choices[picked].correct) return; // already advancing
    setPicked(n);
    if (q.choices[n].correct) {
      // Only count first-try correct
      if (picked === null) setScore((s) => s + 1);
      setTimeout(() => {
        if (i + 1 >= total) setDone(true);
        else setI(i + 1);
      }, 800);
    }
  };

  const tryAgain = () => setPicked(null);

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5 space-y-4 md:space-y-5">
        <div className="space-y-2">
          <ActivityProgress current={i + 1} total={total} label="Question" />
          <p className="text-xs text-muted-foreground text-right">Score: {score}</p>
        </div>

        <audio ref={audioRef} src={q.audio} preload="none" />

        <div className="flex justify-center">
          <Button size="lg" onClick={replay} className="gap-2 min-h-[44px]">
            <Play className="w-5 h-5" /> Play audio
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {q.choices.map((c, n) => {
            const isPicked = picked === n;
            const showCorrect = isPicked && c.correct;
            const showWrong = isPicked && !c.correct;
            return (
              <button
                key={n}
                type="button"
                onClick={() => pick(n)}
                disabled={picked !== null && q.choices[picked].correct}
                className={cn(
                  "relative aspect-[4/3] rounded-xl overflow-hidden border-4 transition-all",
                  showCorrect && "border-green-500 ring-2 ring-green-500/40",
                  showWrong && "border-destructive ring-2 ring-destructive/40",
                  !isPicked && "border-transparent hover:border-primary/50"
                )}
                aria-label={`Choice ${n + 1}`}
              >
                <img src={c.image} alt={c.alt} className="absolute inset-0 w-full h-full object-cover" />
                {showCorrect && (
                  <span className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                    <Check className="w-5 h-5" />
                  </span>
                )}
                {showWrong && (
                  <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                    <X className="w-5 h-5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {picked !== null && !q.choices[picked].correct && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={tryAgain} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
