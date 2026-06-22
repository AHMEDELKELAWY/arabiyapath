import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isSentence,
  isVocab,
  sentenceAudio,
  sentenceText,
  shuffle,
  stripTashkeel,
} from "@/lib/cardClassify";

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

type Question =
  | {
      kind: "listen_image";
      audio: string;
      choices: { image: string; alt: string; correct: boolean }[];
    }
  | {
      kind: "sentence_image";
      sentence: string;
      choices: { image: string; alt: string; correct: boolean }[];
    }
  | {
      kind: "word_for_image";
      image: string;
      alt: string;
      choices: { text: string; correct: boolean }[];
    }
  | {
      kind: "arrange";
      sentence: string; // canonical sentence
      tokens: string[]; // shuffled tokens
      answer: string[]; // correct order tokens
    }
  | {
      kind: "mcq_translation";
      sentence: string;
      choices: { text: string; correct: boolean }[];
    };

interface Props {
  unitId: string;
}

const TOTAL_Q = 10;
const PASS_PCT = 70;

function pickChoices<T>(correct: T, distractors: T[], key: (t: T) => string) {
  const seen = new Set([key(correct)]);
  const uniques: T[] = [];
  for (const d of shuffle(distractors)) {
    const k = key(d);
    if (!seen.has(k)) {
      seen.add(k);
      uniques.push(d);
      if (uniques.length === 2) break;
    }
  }
  return shuffle([correct, ...uniques]);
}

function buildQuestions(cards: CardRow[]): Question[] {
  const sentences = cards.filter(isSentence);
  const vocab = cards.filter(isVocab);
  const withImage = cards.filter((c) => c.image_url);

  const gens: (() => Question | null)[] = [];

  // 1. listen → image
  for (const c of shuffle(sentences)) {
    const audio = sentenceAudio(c);
    if (!audio || !c.image_url) continue;
    const distractors = withImage.filter((d) => d.image_url !== c.image_url);
    if (distractors.length < 2) continue;
    gens.push(() => {
      const choices = pickChoices(c, distractors, (d) => d.image_url!).map((d) => ({
        image: d.image_url!,
        alt: d.image_alt || "",
        correct: d.id === c.id,
      }));
      return { kind: "listen_image", audio, choices };
    });
  }

  // 2. sentence → image
  for (const c of shuffle(sentences)) {
    if (!c.image_url) continue;
    const distractors = withImage.filter((d) => d.image_url !== c.image_url);
    if (distractors.length < 2) continue;
    gens.push(() => {
      const choices = pickChoices(c, distractors, (d) => d.image_url!).map((d) => ({
        image: d.image_url!,
        alt: d.image_alt || "",
        correct: d.id === c.id,
      }));
      return { kind: "sentence_image", sentence: sentenceText(c), choices };
    });
  }

  // 3. word for image (vocab)
  for (const c of shuffle(vocab)) {
    if (!c.image_url) continue;
    const distractors = vocab.filter((d) => d.id !== c.id);
    if (distractors.length < 2) continue;
    gens.push(() => {
      const choices = pickChoices(c, distractors, (d) => d.arabic_text).map((d) => ({
        text: d.arabic_text,
        correct: d.id === c.id,
      }));
      return { kind: "word_for_image", image: c.image_url!, alt: c.image_alt || "", choices };
    });
  }

  // 4. arrange words
  for (const c of shuffle(sentences)) {
    const text = sentenceText(c);
    const tokens = stripTashkeel(text).trim().split(/\s+/);
    const display = text.trim().split(/\s+/);
    if (display.length < 3 || display.length > 6) continue;
    gens.push(() => ({
      kind: "arrange",
      sentence: text,
      tokens: shuffle(display),
      answer: display,
    }));
  }

  // 5. mcq translation
  const withEn = sentences.filter((c) => (c.example_english || c.english_translation));
  for (const c of shuffle(withEn)) {
    const distractors = withEn.filter((d) => d.id !== c.id);
    if (distractors.length < 2) continue;
    const enOf = (d: CardRow) => (d.example_english || d.english_translation || "").trim();
    gens.push(() => {
      const choices = pickChoices(c, distractors, enOf).map((d) => ({
        text: enOf(d),
        correct: d.id === c.id,
      }));
      return { kind: "mcq_translation", sentence: sentenceText(c), choices };
    });
  }

  const shuffled = shuffle(gens);
  const out: Question[] = [];
  for (const g of shuffled) {
    if (out.length >= TOTAL_Q) break;
    const q = g();
    if (q) out.push(q);
  }
  return out;
}

export function TestYourselfQuiz({ unitId }: Props) {
  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-test-quiz", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select(
          "id,arabic_text,english_translation,example_arabic,example_english,image_url,image_alt,audio_url,audio_example_url"
        )
        .eq("unit_id", unitId)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });

  const [seed, setSeed] = useState(0);
  const questions = useMemo(() => buildQuestions(cards ?? []), [cards, seed]);

  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setI(0); setScore(0); setAnswered(false); setWasCorrect(false); setDone(false);
  }, [unitId, seed]);

  if (isLoading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card>;
  }

  if (!questions.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Not enough content in this unit to generate a quiz yet.
        </CardContent>
      </Card>
    );
  }

  const total = questions.length;

  if (done) {
    const pct = Math.round((score / total) * 100);
    const passed = pct >= PASS_PCT;
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold">Quiz complete</h3>
          <p className="text-xl">Score: <strong>{score} / {total}</strong></p>
          <p className="text-lg">Percentage: <strong>{pct}%</strong></p>
          <p className={cn("inline-block px-4 py-1 rounded-full font-semibold",
            passed ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"
          )}>
            {passed ? "Passed" : "Try again"}
          </p>
          <div className="pt-2">
            <Button onClick={() => setSeed((s) => s + 1)} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Restart quiz
            </Button>
          </div>
          {total < TOTAL_Q && (
            <p className="text-xs text-muted-foreground">
              Only {total} questions could be generated from this unit's cards.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const q = questions[i];

  const submitResult = (correct: boolean) => {
    if (answered) return;
    setAnswered(true);
    setWasCorrect(correct);
    if (correct) setScore((s) => s + 1);
  };

  const next = () => {
    setAnswered(false);
    setWasCorrect(false);
    if (i + 1 >= total) setDone(true);
    else setI(i + 1);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Question {i + 1} of {total}</span>
          </div>
          <Progress value={((i + (answered ? 1 : 0)) / total) * 100} />
        </div>

        <QuestionView
          q={q}
          answered={answered}
          onAnswer={submitResult}
        />

        {answered && (
          <div className="flex items-center justify-between">
            <span className={cn("flex items-center gap-2 font-semibold",
              wasCorrect ? "text-green-600" : "text-destructive"
            )}>
              {wasCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              {wasCorrect ? "Correct" : "Incorrect"}
            </span>
            <Button onClick={next}>{i + 1 >= total ? "See score" : "Next"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionView({
  q,
  answered,
  onAnswer,
}: {
  q: Question;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (q.kind === "listen_image" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [q]);

  if (q.kind === "listen_image" || q.kind === "sentence_image") {
    return (
      <div className="space-y-4">
        {q.kind === "listen_image" ? (
          <div className="flex justify-center">
            <audio ref={audioRef} src={q.audio} preload="auto" />
            <Button
              onClick={() => { audioRef.current && (audioRef.current.currentTime = 0, audioRef.current.play().catch(()=>{})); }}
              className="gap-2"
              size="lg"
            >
              <Play className="w-5 h-5" /> Play audio
            </Button>
          </div>
        ) : (
          <p className="text-2xl md:text-3xl font-bold text-center leading-loose" dir="rtl" lang="ar">
            {q.sentence}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {q.choices.map((c, n) => (
            <ChoiceImage
              key={n}
              src={c.image}
              alt={c.alt}
              correct={c.correct}
              answered={answered}
              onClick={() => onAnswer(c.correct)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (q.kind === "word_for_image") {
    return (
      <div className="space-y-4">
        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
          <img src={q.image} alt={q.alt} className="w-full h-full object-cover" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {q.choices.map((c, n) => (
            <ChoiceText
              key={n}
              text={c.text}
              rtl
              correct={c.correct}
              answered={answered}
              onClick={() => onAnswer(c.correct)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (q.kind === "mcq_translation") {
    return (
      <div className="space-y-4">
        <p className="text-2xl md:text-3xl font-bold text-center leading-loose" dir="rtl" lang="ar">
          {q.sentence}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {q.choices.map((c, n) => (
            <ChoiceText
              key={n}
              text={c.text}
              correct={c.correct}
              answered={answered}
              onClick={() => onAnswer(c.correct)}
            />
          ))}
        </div>
      </div>
    );
  }

  // arrange
  return <ArrangeQuestion q={q} answered={answered} onAnswer={onAnswer} />;
}

function ChoiceImage({
  src, alt, correct, answered, onClick,
}: { src: string; alt: string; correct: boolean; answered: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={answered}
      className={cn(
        "relative aspect-[4/3] rounded-xl overflow-hidden border-4 transition-all",
        answered && correct && "border-green-500",
        !answered && "border-transparent hover:border-primary/50"
      )}
    >
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
      {answered && correct && (
        <span className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
          <Check className="w-5 h-5" />
        </span>
      )}
    </button>
  );
}

function ChoiceText({
  text, rtl, correct, answered, onClick,
}: { text: string; rtl?: boolean; correct: boolean; answered: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={answered}
      className={cn(
        "px-4 py-3 rounded-lg border-2 text-base text-left transition-all",
        answered && correct ? "border-green-500 bg-green-50" : "border-border hover:border-primary/50",
        rtl && "text-right text-xl font-semibold"
      )}
      dir={rtl ? "rtl" : "ltr"}
      lang={rtl ? "ar" : undefined}
    >
      {text}
    </button>
  );
}

function ArrangeQuestion({
  q,
  answered,
  onAnswer,
}: {
  q: Extract<Question, { kind: "arrange" }>;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    setPicked([]);
  }, [q]);

  const remaining = q.tokens.map((_, i) => i).filter((i) => !picked.includes(i));

  const submit = () => {
    const built = picked.map((i) => q.tokens[i]).join(" ");
    onAnswer(built === q.answer.join(" "));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Tap the words in the correct order</p>

      <div className="min-h-[3rem] p-3 rounded-lg border-2 border-dashed flex flex-wrap gap-2 justify-end" dir="rtl" lang="ar">
        {picked.length === 0 ? (
          <span className="text-muted-foreground text-sm">…</span>
        ) : (
          picked.map((tok, n) => (
            <button
              key={n}
              type="button"
              disabled={answered}
              onClick={() => setPicked(picked.filter((_, j) => j !== n))}
              className="px-3 py-1.5 rounded bg-primary/10 text-primary font-semibold"
            >
              {q.tokens[tok]}
            </button>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center" dir="rtl" lang="ar">
        {remaining.map((tok) => (
          <button
            key={tok}
            type="button"
            disabled={answered}
            onClick={() => setPicked([...picked, tok])}
            className="px-3 py-1.5 rounded border-2 border-border hover:border-primary/50 font-semibold"
          >
            {q.tokens[tok]}
          </button>
        ))}
      </div>

      {!answered && (
        <div className="flex justify-center">
          <Button onClick={submit} disabled={picked.length !== q.tokens.length}>
            Check answer
          </Button>
        </div>
      )}

      {answered && (
        <p className="text-center text-sm text-muted-foreground">
          Correct order: <span dir="rtl" lang="ar" className="font-semibold">{q.answer.join(" ")}</span>
        </p>
      )}
    </div>
  );
}
