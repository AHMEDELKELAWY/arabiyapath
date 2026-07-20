import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitQuizRequest {
  quizId: string;
  // Preferred: map of questionId -> selected answer
  answers: Record<string, string> | Record<number, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quizId, answers }: SubmitQuizRequest = await req.json();

    if (!quizId || !answers || typeof answers !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request: quizId and answers required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Detect payload shape. New shape: keys are question UUIDs.
    // Legacy shape: keys are order indices (numeric strings).
    const keys = Object.keys(answers);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isIdKeyed = keys.some((k) => uuidRegex.test(k));

    const { data: allQuestions, error: questionsError } = await adminClient
      .from("quiz_questions")
      .select("id, prompt, correct_answer, order_index, metadata")
      .eq("quiz_id", quizId)
      .order("order_index");

    if (questionsError || !allQuestions || allQuestions.length === 0) {
      return new Response(JSON.stringify({ error: "Quiz not found or has no questions" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    type IdResult = {
      questionId: string;
      correct: boolean;
      correctAnswer: string;
      userAnswer: string | null;
      prompt: string;
      explanation: string | null;
    };
    type LegacyResult = {
      questionIndex: number;
      correct: boolean;
      correctAnswer: string;
      userAnswer: string | null;
      prompt: string;
      explanation: string | null;
    };

    let correctCount = 0;
    let totalQuestions = 0;
    const idResults: IdResult[] = [];
    const legacyResults: LegacyResult[] = [];

    const explanationOf = (q: { metadata?: Record<string, unknown> | null }): string | null => {
      const raw = q.metadata && typeof q.metadata === "object"
        ? (q.metadata as Record<string, unknown>).explanation
        : null;
      return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
    };

    if (isIdKeyed) {
      // Score only the questions the server served this attempt.
      const byId = new Map(allQuestions.map((q) => [q.id, q]));
      for (const [qid, userAnswer] of Object.entries(answers as Record<string, string>)) {
        const q = byId.get(qid);
        if (!q) continue;
        const isCorrect = userAnswer === q.correct_answer;
        if (isCorrect) correctCount++;
        idResults.push({
          questionId: qid,
          correct: isCorrect,
          correctAnswer: q.correct_answer,
          userAnswer: userAnswer ?? null,
          prompt: q.prompt,
          explanation: explanationOf(q),
        });
        totalQuestions++;
      }
      if (totalQuestions === 0) {
        return new Response(JSON.stringify({ error: "No valid answers matched quiz questions" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Legacy path: index-keyed against full ordered pool.
      totalQuestions = allQuestions.length;
      allQuestions.forEach((q, index) => {
        const userAnswer = (answers as Record<number, string>)[index];
        const isCorrect = userAnswer === q.correct_answer;
        if (isCorrect) correctCount++;
        legacyResults.push({
          questionIndex: index,
          correct: isCorrect,
          correctAnswer: q.correct_answer,
          userAnswer: userAnswer ?? null,
          prompt: q.prompt,
          explanation: explanationOf(q),
        });
      });
    }

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70;

    const { data: attemptRow, error: insertError } = await adminClient
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        passed,
      })
      .select("id")
      .single();

    if (insertError || !attemptRow) {
      console.error("Failed to insert quiz attempt:", insertError);
      return new Response(JSON.stringify({ error: "Failed to record quiz attempt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log per-question history for adaptive selection. Best-effort; failures don't block scoring.
    try {
      const rows = (isIdKeyed ? idResults : []).map((r) => ({
        attempt_id: attemptRow.id,
        question_id: r.questionId,
        was_correct: r.correct,
      }));
      if (rows.length > 0) {
        const { error: logErr } = await adminClient
          .from("quiz_attempt_questions")
          .insert(rows);
        if (logErr) console.warn("quiz_attempt_questions insert failed:", logErr);
      }
    } catch (e) {
      console.warn("quiz_attempt_questions logging error:", e);
    }

    // Certificate eligibility (unchanged)
    let certificateAwarded = false;
    if (passed) {
      const { data: quiz } = await adminClient
        .from("quizzes")
        .select("unit_id, units(level_id, levels(dialect_id))")
        .eq("id", quizId)
        .single();

      // deno-lint-ignore no-explicit-any
      const unitData = quiz?.units as any;
      if (unitData?.level_id && unitData?.levels?.dialect_id) {
        const levelId = unitData.level_id;
        const dialectId = unitData.levels.dialect_id;

        const { data: levelUnits } = await adminClient
          .from("units")
          .select("id")
          .eq("level_id", levelId);

        if (levelUnits && levelUnits.length > 0) {
          const unitIds = levelUnits.map((u) => u.id);
          const { data: allQuizzes } = await adminClient
            .from("quizzes")
            .select("id")
            .in("unit_id", unitIds);

          if (allQuizzes && allQuizzes.length > 0) {
            const allQuizIds = allQuizzes.map((q) => q.id);
            const { data: passedQuizzes } = await adminClient
              .from("quiz_attempts")
              .select("quiz_id")
              .eq("user_id", user.id)
              .eq("passed", true)
              .in("quiz_id", allQuizIds);

            const passedQuizIds = new Set(passedQuizzes?.map((p) => p.quiz_id) || []);

            if (passedQuizIds.size >= allQuizzes.length) {
              const { data: existingCert } = await adminClient
                .from("certificates")
                .select("id")
                .eq("user_id", user.id)
                .eq("level_id", levelId)
                .eq("dialect_id", dialectId)
                .maybeSingle();

              if (!existingCert) {
                const certCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                await adminClient.from("certificates").insert({
                  user_id: user.id,
                  level_id: levelId,
                  dialect_id: dialectId,
                  cert_code: certCode,
                });
                certificateAwarded = true;
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        score,
        passed,
        correctCount,
        totalQuestions,
        // Preferred: id-keyed results. Legacy consumers still get results[].
        idResults,
        results: isIdKeyed
          ? idResults.map((r, i) => ({
              questionIndex: i,
              correct: r.correct,
              correctAnswer: r.correctAnswer,
              userAnswer: r.userAnswer,
              prompt: r.prompt,
              explanation: r.explanation,
            }))
          : legacyResults,
        certificateAwarded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Submit quiz error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
