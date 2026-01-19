import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitQuizRequest {
  quizId: string;
  answers: Record<number, string>; // questionIndex -> selectedAnswer
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's auth token to get their identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Verify the user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { quizId, answers }: SubmitQuizRequest = await req.json();
    
    if (!quizId || !answers || typeof answers !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request: quizId and answers required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to access correct answers (hidden from client)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get quiz questions with correct answers (server-side only)
    const { data: questions, error: questionsError } = await adminClient
      .from("quiz_questions")
      .select("id, correct_answer, order_index")
      .eq("quiz_id", quizId)
      .order("order_index");

    if (questionsError || !questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Quiz not found or has no questions" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate score server-side
    let correctCount = 0;
    const results: { questionIndex: number; correct: boolean; correctAnswer: string }[] = [];

    questions.forEach((q, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correctCount++;
      
      results.push({
        questionIndex: index,
        correct: isCorrect,
        correctAnswer: q.correct_answer, // Only revealed after submission
      });
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70;

    // Record the attempt
    const { error: insertError } = await adminClient
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        passed,
      });

    if (insertError) {
      console.error("Failed to insert quiz attempt:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record quiz attempt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If passed, check for level certificate eligibility
    let certificateAwarded = false;
    if (passed) {
      // Get quiz unit and level info
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

        // Get all units in this level
        const { data: levelUnits } = await adminClient
          .from("units")
          .select("id")
          .eq("level_id", levelId);

        if (levelUnits && levelUnits.length > 0) {
          const unitIds = levelUnits.map(u => u.id);
          
          // Get all quizzes for these units
          const { data: allQuizzes } = await adminClient
            .from("quizzes")
            .select("id")
            .in("unit_id", unitIds);

          if (allQuizzes && allQuizzes.length > 0) {
            const allQuizIds = allQuizzes.map(q => q.id);
            
            // Get user's passed quizzes for this level
            const { data: passedQuizzes } = await adminClient
              .from("quiz_attempts")
              .select("quiz_id")
              .eq("user_id", user.id)
              .eq("passed", true)
              .in("quiz_id", allQuizIds);

            const passedQuizIds = new Set(passedQuizzes?.map(p => p.quiz_id) || []);
            
            // If all quizzes are passed, grant level certificate
            if (passedQuizIds.size >= allQuizzes.length) {
              // Check if certificate already exists
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
        results, // Contains correct answers - only sent after submission
        certificateAwarded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Submit quiz error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
