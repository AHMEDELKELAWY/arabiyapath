import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TARGET = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

    const { data: allQuestions, error: qErr } = await admin
      .from("quiz_questions")
      .select("id, type, prompt, options_json, audio_url, order_index")
      .eq("quiz_id", quizId)
      .order("order_index");

    if (qErr || !allQuestions || allQuestions.length === 0) {
      return new Response(JSON.stringify({ error: "Quiz has no questions" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine subset size: quiz.question_count if set, otherwise min(DEFAULT_TARGET, pool).
    const target =
      quiz.question_count && quiz.question_count > 0
        ? Math.min(quiz.question_count, allQuestions.length)
        : Math.min(DEFAULT_TARGET, allQuestions.length);

    // Randomly select `target` questions from the full pool, then shuffle order + options.
    const picked = shuffle(allQuestions).slice(0, target).map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      audio_url: q.audio_url,
      options: shuffle((q.options_json as string[]) ?? []),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        quiz: { id: quiz.id, unit_id: quiz.unit_id },
        unit: (quiz as any).units,
        level: (quiz as any).units?.levels,
        dialect: (quiz as any).units?.levels?.dialects,
        totalPool: allQuestions.length,
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
