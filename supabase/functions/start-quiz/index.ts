import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WEIGHTS, type Difficulty } from "./weights.ts";
import { serializeQuestion, type RawQuestion } from "./serializers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeDifficulty(d: string | null | undefined): Difficulty {
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return "medium";
}

// Weighted sampling without replacement.
function weightedSample<T extends { _score: number }>(items: T[], n: number): T[] {
  const pool = items.map((it) => ({ ...it }));
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const total = pool.reduce((s, x) => s + Math.max(x._score, 0.0001), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= Math.max(pool[idx]._score, 0.0001);
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

// Build target counts per difficulty summing to `target`.
function difficultyTargets(target: number): Record<Difficulty, number> {
  const mix = WEIGHTS.DIFFICULTY_MIX;
  const raw = {
    easy: target * mix.easy,
    medium: target * mix.medium,
    hard: target * mix.hard,
  } as Record<Difficulty, number>;
  const rounded = {
    easy: Math.round(raw.easy),
    medium: Math.round(raw.medium),
    hard: Math.round(raw.hard),
  } as Record<Difficulty, number>;
  let diff = target - (rounded.easy + rounded.medium + rounded.hard);
  // Prefer medium for correction, then easy, then hard.
  const order: Difficulty[] = ["medium", "easy", "hard"];
  let i = 0;
  while (diff !== 0 && i < 100) {
    const key = order[i % order.length];
    if (diff > 0) { rounded[key]++; diff--; }
    else if (rounded[key] > 0) { rounded[key]--; diff++; }
    i++;
  }
  return rounded;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quizId } = await req.json();
    if (!quizId) {
      return new Response(JSON.stringify({ error: "quizId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: quiz, error: quizErr } = await admin
      .from("quizzes")
      .select("id, unit_id, question_count, units(id, title, order_index, levels(id, name, order_index, dialects(id, name, slug)))")
      .eq("id", quizId)
      .single();

    if (quizErr || !quiz) {
      return new Response(JSON.stringify({ error: "Quiz not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pool, error: qErr } = await admin
      .from("quiz_questions")
      .select("id, type, question_type, difficulty, prompt, options_json, audio_url, order_index, metadata")
      .eq("quiz_id", quizId);

    if (qErr || !pool || pool.length === 0) {
      return new Response(JSON.stringify({ error: "Quiz has no questions" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = quiz.question_count && quiz.question_count > 0
      ? Math.min(quiz.question_count, pool.length)
      : Math.min(WEIGHTS.DEFAULT_TARGET, pool.length);

    // --- Adaptive selection ---
    // 1. Find question IDs from the user's most recent attempt of this quiz.
    const { data: lastAttempt } = await admin
      .from("quiz_attempts")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let recentIds = new Set<string>();
    if (lastAttempt?.id) {
      const { data: recentRows } = await admin
        .from("quiz_attempt_questions")
        .select("question_id")
        .eq("attempt_id", lastAttempt.id);
      recentIds = new Set((recentRows ?? []).map((r) => r.question_id as string));
    }

    // 2. Fetch per-user wrong/correct counts across all attempts for this quiz.
    const { data: history } = await admin
      .from("quiz_attempt_questions")
      .select("question_id, was_correct, attempt_id, quiz_attempts!inner(user_id, quiz_id)")
      .eq("quiz_attempts.user_id", user.id)
      .eq("quiz_attempts.quiz_id", quizId);

    const wrong = new Map<string, number>();
    const correct = new Map<string, number>();
    for (const row of history ?? []) {
      const qid = (row as any).question_id as string;
      if ((row as any).was_correct) correct.set(qid, (correct.get(qid) ?? 0) + 1);
      else wrong.set(qid, (wrong.get(qid) ?? 0) + 1);
    }

    // 3. Score every candidate.
    type Scored = RawQuestion & { _score: number; _bucket: Difficulty; _recent: boolean };
    const scored: Scored[] = pool.map((q: any) => {
      const w = wrong.get(q.id) ?? 0;
      const c = correct.get(q.id) ?? 0;
      let score = WEIGHTS.BASE_SCORE
        + Math.min(w * WEIGHTS.WRONG_BONUS, WEIGHTS.WRONG_BONUS_CAP)
        - c * WEIGHTS.CORRECT_PENALTY;
      score = Math.max(score, WEIGHTS.MIN_SCORE);
      const isRecent = recentIds.has(q.id);
      if (isRecent) score *= WEIGHTS.RECENT_MULTIPLIER;
      return {
        id: q.id,
        type: q.type ?? null,
        question_type: q.question_type ?? "multiple_choice",
        difficulty: q.difficulty ?? null,
        prompt: q.prompt,
        options_json: q.options_json,
        audio_url: q.audio_url,
        metadata: q.metadata ?? {},
        _score: score,
        _bucket: normalizeDifficulty(q.difficulty),
        _recent: isRecent,
      };
    });

    // 4. Split into difficulty buckets, fresh-first.
    const buckets: Record<Difficulty, { fresh: Scored[]; recent: Scored[] }> = {
      easy: { fresh: [], recent: [] },
      medium: { fresh: [], recent: [] },
      hard: { fresh: [], recent: [] },
    };
    for (const s of scored) {
      (s._recent ? buckets[s._bucket].recent : buckets[s._bucket].fresh).push(s);
    }

    const targets = difficultyTargets(target);
    const chosen: Scored[] = [];
    const chosenIds = new Set<string>();

    const takeFrom = (arr: Scored[], n: number) => {
      const remaining = arr.filter((x) => !chosenIds.has(x.id));
      const picked = weightedSample(remaining, n);
      for (const p of picked) {
        chosen.push(p);
        chosenIds.add(p.id);
      }
      return picked.length;
    };

    // Pass 1: fresh per difficulty.
    for (const d of ["easy", "medium", "hard"] as Difficulty[]) {
      const need = targets[d];
      if (need <= 0) continue;
      takeFrom(buckets[d].fresh, need);
    }

    // Pass 2: fresh from any difficulty for anything still missing.
    if (chosen.length < target) {
      const allFresh = ([] as Scored[]).concat(
        buckets.easy.fresh, buckets.medium.fresh, buckets.hard.fresh,
      );
      takeFrom(allFresh, target - chosen.length);
    }

    // Pass 3: recent per difficulty.
    if (chosen.length < target) {
      for (const d of ["easy", "medium", "hard"] as Difficulty[]) {
        if (chosen.length >= target) break;
        takeFrom(buckets[d].recent, target - chosen.length);
      }
    }

    // Pass 4: recent from any difficulty.
    if (chosen.length < target) {
      const allRecent = ([] as Scored[]).concat(
        buckets.easy.recent, buckets.medium.recent, buckets.hard.recent,
      );
      takeFrom(allRecent, target - chosen.length);
    }

    // 5. Final display shuffle + type-aware serialization.
    const picked = shuffle(chosen).map((q) => serializeQuestion(q));

    return new Response(
      JSON.stringify({
        success: true,
        quiz: { id: quiz.id, unit_id: quiz.unit_id },
        unit: (quiz as any).units,
        level: (quiz as any).units?.levels,
        dialect: (quiz as any).units?.levels?.dialects,
        totalPool: pool.length,
        questions: picked,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("start-quiz error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
