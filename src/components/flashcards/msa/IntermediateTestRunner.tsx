/**
 * Intermediate Test Runner.
 * One-question-per-screen quiz with progress, prev/next, submit and final score.
 * Supports these question_type values stored in flashcard_unit_tests:
 *   - multiple_choice
 *   - fill_in_blank
 *   - sentence_ordering
 *   - matching
 *   - audio
 *   - grammar_selection
 *   - conversation_completion
 *   - vocab_in_context
 * Falls back to a plain single-answer input for unknown types.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ActivityProgress } from "./ActivityProgress";
import { Check, X, ChevronLeft, ChevronRight, RotateCcw, Play, Trophy, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface TestQuestion {
  id: string;
  question_type: string;
  question: string;
  passage: string | null;
  options: any;
  correct_answer: any;
 explanation: string | null;
 teaching_explanation?: string | null;
  audio_url: string | null;
  image_url: string | null;
  order_index: number;
}

interface Props {
  unitId: string;
  /** Called after the learner acknowledges the completion screen with a passing score. */
  onPassed?: () => void;
  /** Optional post-completion navigation UI shown on the celebration screen. */
  nextUnitSlug?: string | null;
  nextUnitTitle?: string | null;
  /** Called when user clicks "Review this unit" on completion screen. */
  onReviewUnit?: () => void;
}



const PASS_PCT = 70;

/* -------------------- helpers -------------------- */

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function norm(s: string): string {
  return (s ?? "")
    .toString()
    .trim()
    .replace(/[\u064B-\u0652\u0670]/g, "") // strip tashkeel
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Extract an options array from mixed formats: array, {choices:[]}, JSON string. */
function optionList(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.choices)) return raw.choices;
    if (Array.isArray(raw.options)) return raw.options;
    return Object.values(raw);
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return raw.split("|").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/** Evaluate correctness given the question and user answer. */
function isCorrect(q: TestQuestion, userAnswer: any): boolean {
  const c = q.correct_answer;
  switch (q.question_type) {
    case "sentence_ordering": {
      const correctArr = Array.isArray(c) ? c : optionList(c);
      const user = Array.isArray(userAnswer) ? userAnswer : [];
      if (user.length !== correctArr.length) return false;
      return user.every((w, i) => norm(String(w)) === norm(String(correctArr[i])));
    }
    case "matching": {
      // correct_answer: array of {left, right} OR object {left:right}
      const pairs: Record<string, string> =
        Array.isArray(c)
          ? Object.fromEntries(
              c.map((p: any) =>
                Array.isArray(p) ? [String(p[0]), String(p[1])] : [String(p.left ?? p.a), String(p.right ?? p.b)]
              )
            )
          : (c && typeof c === "object" ? c : {});
      const user = (userAnswer ?? {}) as Record<string, string>;
      const keys = Object.keys(pairs);
      if (keys.length === 0) return false;
      return keys.every((k) => norm(user[k] ?? "") === norm(pairs[k]));
    }
    case "fill_in_blank": {
      const accepted = Array.isArray(c) ? c : [c];
      return accepted.some((a) => norm(String(a)) === norm(String(userAnswer ?? "")));
}
    default: {
      // multiple_choice / grammar_selection / conversation_completion / audio / vocab_in_context / mcq default
      const correct = Array.isArray(c) ? c[0] : c;
      return norm(String(correct ?? "")) === norm(String(userAnswer ?? ""));
    }
  }
}

function formatAnswer(v: any): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") {
      return v.map((p: any) => `${p.left ?? p.a ?? ""} → ${p.right ?? p.b ?? ""}`).join(", ");
    }
    return v.join(" ");
  }
  if (typeof v === "object") {
    return Object.entries(v).map(([k, val]) => `${k} → ${val}`).join(", ");
  }
  return String(v);
}

/* -------------------- main -------------------- */

export function IntermediateTestRunner({ unitId, onPassed, nextUnitSlug, nextUnitTitle, onReviewUnit }: Props) {
  const { data: questions, isLoading, error, refetch, isRefetching } = useQuery<TestQuestion[]>({
    queryKey: ["fc-unit-test", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_unit_tests")
        .select("id,question_type,question,passage,options,correct_answer,explanation,teaching_explanation,audio_url,image_url,order_index")
        .eq("unit_id", unitId)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as TestQuestion[];
    },
  });

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<"review" | "score">("review");
  const [resetKey, setResetKey] = useState(0);
  const startedAtRef = useRef<Date | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    setI(0);
    setAnswers({});
    setSubmitted(false);
    setPhase("review");
    startedAtRef.current = new Date();
    recordedRef.current = false;
  }, [unitId, resetKey]);


  const total = questions?.length ?? 0;
  const q = questions?.[i];

  const score = useMemo(() => {
    if (!questions) return 0;
    return questions.reduce((n, qq) => (isCorrect(qq, answers[qq.id]) ? n + 1 : n), 0);
  }, [questions, answers]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="h-2 w-full rounded bg-muted animate-pulse" />
          <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-11 w-full rounded bg-muted animate-pulse" />
            <div className="h-11 w-full rounded bg-muted animate-pulse" />
            <div className="h-11 w-full rounded bg-muted animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>Couldn't load the test. Please try again.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!questions?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No test questions yet. Check back soon.
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    const pct = Math.round((score / total) * 100);
    const passed = pct >= PASS_PCT;

    // Persist attempt once per submission.
    if (!recordedRef.current) {
      recordedRef.current = true;
      const started = startedAtRef.current ?? new Date();
      const finished = new Date();
      const duration = Math.max(0, Math.round((finished.getTime() - started.getTime()) / 1000));
      (async () => {
        try {
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes?.user?.id;
          if (uid) {
            await (supabase as any).from("flashcard_intermediate_test_attempts").insert({
              user_id: uid,
              unit_id: unitId,
              score,
              total,
              percentage: pct,
              passed,
              started_at: started.toISOString(),
              finished_at: finished.toISOString(),
              duration_seconds: duration,
            });
          }
        } catch (e) {
          console.warn("[test-attempt] record failed", e);
        }
      })();
    }

    if (phase === "review") {
      return (
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Answer review</h3>
              <span className="text-sm text-muted-foreground">
                {score} / {total} correct
              </span>
            </div>
            <div className="space-y-3">
              {questions.map((qq, idx) => {
                const ua = answers[qq.id];
                const ok = isCorrect(qq, ua);
                const correctDisplay = formatAnswer(qq.correct_answer);
                const userDisplay = formatAnswer(ua);
                return (
                  <Card key={qq.id} className={cn("border-2", ok ? "border-green-500/40" : "border-destructive/40")}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          "mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                          ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                        )}>
                          {ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">
                            Question {idx + 1} · <span className="capitalize">{qq.question_type.replace(/_/g, " ")}</span>
                          </p>
                          <p className="font-medium">{qq.question}</p>
                          {qq.passage && (
                            <p className="text-sm bg-muted/40 rounded p-2 mt-1 leading-loose" dir="rtl" lang="ar">
                              {qq.passage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm space-y-1 pl-8">
                        <p>
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={ok ? "text-green-700" : "text-destructive"}>{userDisplay || "—"}</span>
                        </p>
                        {!ok && (
                          <p>
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-green-700 font-medium">{correctDisplay}</span>
                          </p>
                        )}
                        {qq.explanation && (
                          <p className="text-muted-foreground italic">
                            <span className="not-italic font-medium text-foreground">Why: </span>
                            {qq.explanation}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setPhase("score")} className="gap-1 min-h-[44px]">
                See final score <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Score / completion screen
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-6 md:p-8 text-center space-y-4">
          <div className={cn(
            "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
            passed ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
          )}>
            <Trophy className="w-8 h-8" />
          </div>
          {passed ? (
            <>
              <h3 className="text-2xl font-bold">✅ Unit Completed</h3>
              <p className="text-muted-foreground">Congratulations!</p>
            </>
          ) : (
            <h3 className="text-2xl font-bold">Test complete</h3>
          )}
          <p className="text-xl">Score: <strong>{score} / {total}</strong></p>
          <div className="max-w-xs mx-auto">
            <Progress value={pct} />
          </div>
          <p className="text-lg">Percentage: <strong>{pct}%</strong></p>
          <p className={cn("inline-block px-4 py-1 rounded-full font-semibold",
            passed ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"
          )}>
            {passed ? `Passed (≥ ${PASS_PCT}%)` : `Below passing (${PASS_PCT}%)`}
          </p>

          {!passed && (
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              You need at least {PASS_PCT}% to complete this unit. Review your answers, then try again.
            </p>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => setPhase("review")} className="gap-2 min-h-[44px]">
              Review answers
            </Button>
            {passed ? (
              <>
                {onReviewUnit && (
                  <Button variant="outline" onClick={onReviewUnit} className="gap-2 min-h-[44px]">
                    Review this unit
                  </Button>
                )}
                <Button
                  onClick={() => { try { onPassed?.(); } catch { /* noop */ } }}
                  className="gap-2 min-h-[44px]"
                >
                  {nextUnitSlug
                    ? `Continue to ${nextUnitTitle || "next unit"}`
                    : "Return to Intermediate Home"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => setResetKey((k) => k + 1)} className="gap-2 min-h-[44px]">
                <RotateCcw className="w-4 h-4" /> Retake Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLast = i === total - 1;
  const userAnswer = q ? answers[q.id] : undefined;
  const answered =
    q?.question_type === "matching"
      ? userAnswer && Object.keys(userAnswer).length > 0
      : q?.question_type === "sentence_ordering"
      ? Array.isArray(userAnswer) && userAnswer.length > 0
      : userAnswer !== undefined && userAnswer !== "";

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="p-4 md:p-6 space-y-4">
        <ActivityProgress current={i + 1} total={total} label="Question" />

        {q && (
          <QuestionView
            key={q.id}
            question={q}
            value={userAnswer}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="gap-1 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          {isLast ? (
            <Button
              onClick={() => setSubmitted(true)}
              disabled={!answered}
              className="gap-1 min-h-[44px]"
            >
              Submit <Check className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setI((n) => Math.min(total - 1, n + 1))}
              disabled={!answered}
              className="gap-1 min-h-[44px]"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------- question renderers -------------------- */

function QuestionView({
  question,
  value,
  onChange,
}: {
  question: TestQuestion;
  value: any;
  onChange: (v: any) => void;
}) {
  const opts = optionList(question.options).map((o: any) => String(o));

  const header = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 rounded bg-muted capitalize">
          {question.question_type.replace(/_/g, " ")}
        </span>
      </div>
      {question.passage && (
        <p
          className="text-sm bg-muted/40 rounded p-3 leading-loose"
          dir="rtl"
          lang="ar"
        >
          {question.passage}
        </p>
      )}
      {question.audio_url && (
        <AudioButton src={question.audio_url} autoplay={question.question_type === "audio"} />
      )}
      {question.image_url && (
        <div className="flex justify-center">
          <img
            src={question.image_url}
            alt=""
            loading="lazy"
            className="max-h-64 w-auto rounded-lg border object-contain bg-muted/30"
          />
        </div>
      )}
      <p className="text-base md:text-lg font-medium leading-relaxed">{question.question}</p>
    </div>
  );

  if (question.question_type === "sentence_ordering") {
    return (
      <div className="space-y-3">
        {header}
        <SentenceOrdering options={opts} value={value ?? []} onChange={onChange} />
      </div>
    );
  }

  if (question.question_type === "matching") {
    return (
      <div className="space-y-3">
        {header}
        <MatchingGrid
          pairs={question.options}
          value={value ?? {}}
          onChange={onChange}
        />
      </div>
    );
  }

  if (question.question_type === "fill_in_blank") {
    return (
      <div className="space-y-3">
        {header}
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          dir="rtl"
          lang="ar"
          className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary bg-background text-lg text-right"
          placeholder="اكتب إجابتك هنا…"
        />
      </div>
    );
  }

  // MCQ-family fallback (multiple_choice, grammar_selection, conversation_completion, audio, vocab_in_context, unknown)
  return (
    <div className="space-y-3">
      {header}
      <div className="grid grid-cols-1 gap-2">
        {opts.length ? (
          opts.map((opt, idx) => {
            const chosen = value === opt;
            const rtl = /[\u0600-\u06FF]/.test(opt);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onChange(opt)}
                className={cn(
                  "px-4 py-3 rounded-lg border-2 text-base transition-all min-h-[48px]",
                  chosen ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  rtl ? "text-right text-lg" : "text-left"
                )}
                dir={rtl ? "rtl" : "ltr"}
                lang={rtl ? "ar" : undefined}
              >
                {opt}
              </button>
            );
          })
        ) : (
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-border focus:border-primary bg-background text-base"
            placeholder="Type your answer…"
          />
        )}
      </div>
    </div>
  );
}

function AudioButton({ src, autoplay }: { src: string; autoplay?: boolean }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (autoplay && ref.current) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }
  }, [autoplay, src]);
  return (
    <div className="flex justify-center py-1">
      <audio ref={ref} src={src} preload="auto" />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (!ref.current) return;
          ref.current.currentTime = 0;
          ref.current.play().catch(() => {});
        }}
        className="gap-2 min-h-[44px]"
      >
        <Play className="w-4 h-4" /> Play audio
      </Button>
    </div>
  );
}

function SentenceOrdering({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const pool = useMemo(() => shuffle(options), [options.join("|")]);
  const remaining = pool.filter((w, idx) => {
    // Track used tokens by count (allow duplicates)
    const used = value.slice();
    for (let n = 0; n < idx; n++) {
      const j = used.indexOf(pool[n]);
      if (j >= 0) used.splice(j, 1);
    }
    return !used.includes(w) || value.filter((v) => v === w).length < options.filter((o) => o === w).length;
  });

  // Simpler: derive available slots by count of each token vs picked count
  const counts: Record<string, number> = {};
  options.forEach((o) => (counts[o] = (counts[o] || 0) + 1));
  const pickedCounts: Record<string, number> = {};
  value.forEach((v) => (pickedCounts[v] = (pickedCounts[v] || 0) + 1));

  return (
    <div className="space-y-3">
      <div
        className="min-h-[3.5rem] p-3 rounded-lg border-2 border-dashed flex flex-wrap gap-2 justify-end"
        dir="rtl"
        lang="ar"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground text-sm self-center">اضغط الكلمات بالترتيب…</span>
        ) : (
          value.map((w, idx) => (
            <button
              key={`${w}-${idx}`}
              type="button"
              onClick={() => onChange(value.filter((_, n) => n !== idx))}
              className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-lg font-semibold hover:bg-primary/20"
            >
              {w}
            </button>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2 justify-end" dir="rtl" lang="ar">
        {pool.map((w, idx) => {
          const usedUp = (pickedCounts[w] || 0) >= (counts[w] || 0);
          return (
            <button
              key={`${w}-p-${idx}`}
              type="button"
              disabled={usedUp}
              onClick={() => onChange([...value, w])}
              className={cn(
                "px-3 py-2 rounded-lg border-2 text-lg font-semibold transition-colors",
                usedUp
                  ? "opacity-30 border-border cursor-not-allowed"
                  : "border-border hover:border-primary hover:bg-primary/5"
              )}
            >
              {w}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

function MatchingGrid({
  pairs,
  value,
  onChange,
}: {
  pairs: any;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  // Normalize pairs → array of { left, right }
  const list = useMemo(() => {
    if (Array.isArray(pairs)) {
      return pairs.map((p: any) =>
        Array.isArray(p)
          ? { left: String(p[0]), right: String(p[1]) }
          : { left: String(p.left ?? p.a ?? ""), right: String(p.right ?? p.b ?? "") }
      );
    }
    if (pairs && typeof pairs === "object") {
      return Object.entries(pairs).map(([l, r]) => ({ left: String(l), right: String(r) }));
    }
    return [];
  }, [pairs]);

  const rights = useMemo(() => shuffle(list.map((p) => p.right)), [list]);

  return (
    <div className="space-y-2">
      {list.map((p) => {
        const rtlLeft = /[\u0600-\u06FF]/.test(p.left);
        return (
          <div key={p.left} className="flex items-center gap-2">
            <span
              className={cn(
                "flex-1 px-3 py-2 rounded border bg-muted/40 font-medium",
                rtlLeft && "text-right text-lg"
              )}
              dir={rtlLeft ? "rtl" : "ltr"}
              lang={rtlLeft ? "ar" : undefined}
            >
              {p.left}
            </span>
            <select
              value={value[p.left] ?? ""}
              onChange={(e) => onChange({ ...value, [p.left]: e.target.value })}
              className="flex-1 px-3 py-2 rounded border-2 border-border bg-background min-h-[44px]"
            >
              <option value="">— Choose —</option>
              {rights.map((r, idx) => (
                <option key={`${r}-${idx}`} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
