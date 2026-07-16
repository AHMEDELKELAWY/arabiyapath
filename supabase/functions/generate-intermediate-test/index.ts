// Generate an Intermediate-level Test using Lovable AI Gateway (Gemini 2.5 Pro).
//
// Reference inputs:
//   1. flashcard_units.lesson_topic  — primary topic reference (30% of questions)
//   2. flashcards where kind='learn'  — vocabulary (30% of questions)
//   3. flashcards where kind='grammar' — grammar rules (20% of questions)
//   4. original AI-authored inference questions using all context (20%)
//
// Question types the runner supports (must be one of these):
//   multiple_choice, grammar_selection, conversation_completion,
//   vocab_in_context, audio, fill_in_blank, sentence_ordering, matching,
//   reading_comprehension.
//
// Output: rows in `flashcard_unit_tests`. Existing rows for the unit are wiped
// so the admin gets a clean regenerated set.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";

const BodySchema = z.object({ unit_id: z.string().uuid() });

const ALLOWED_TYPES = [
  "multiple_choice",
  "grammar_selection",
  "conversation_completion",
  "vocab_in_context",
  "fill_in_blank",
  "sentence_ordering",
  "matching",
  "reading_comprehension",
  "audio",
] as const;

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { unit_id } = parsed.data;

    // Verify caller is admin
    const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "auth required" }, 401);
    const authClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes } = await authClient.auth.getUser(jwt);
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: "not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "admin required" }, 403);

    // Gather context
    const { data: unit, error: unitErr } = await admin
      .from("flashcard_units")
      .select("id, title_en, title_ar, lesson_topic, video_url, video_storage_path")
      .eq("id", unit_id).single();
    if (unitErr || !unit) return json({ error: "unit not found" }, 404);

    const { data: learnCards } = await admin
      .from("flashcards")
      .select("arabic_text, transliteration, english_translation, notes")
      .eq("unit_id", unit_id).eq("kind", "learn").eq("published", true).limit(120);

    const { data: grammarCards } = await admin
      .from("flashcards")
      .select("arabic_text, english_translation, notes")
      .eq("unit_id", unit_id).eq("kind", "grammar").eq("published", true).limit(60);

    // Fetch previous questions so the AI can avoid repeating them on regenerate.
    const { data: previousQs } = await admin
      .from("flashcard_unit_tests")
      .select("question")
      .eq("unit_id", unit_id)
      .limit(50);
    const previousList = (previousQs ?? [])
      .map((r: any, i: number) => `${i + 1}. ${r.question}`)
      .join("\n");

    const vocabList = (learnCards ?? []).map((c: any) =>
      `- ${c.arabic_text}${c.transliteration ? ` (${c.transliteration})` : ""} = ${c.english_translation}${c.notes ? ` — ${c.notes}` : ""}`
    ).join("\n");
    const grammarList = (grammarCards ?? []).map((c: any) =>
      `- ${c.arabic_text} — ${c.english_translation}${c.notes ? `\n  Note: ${c.notes}` : ""}`
    ).join("\n");

    const prompt = `You are a senior Arabic language curriculum designer creating an INTERMEDIATE-level assessment (CEFR B1). Learners have already mastered vocabulary drills at the beginner level — this test must feel meaningfully harder than a beginner quiz.

## Unit
Title (EN): ${unit.title_en}
Title (AR): ${unit.title_ar ?? ""}

## Lesson Topic (primary reference)
${unit.lesson_topic ?? "(none provided)"}

## Listening resource (context only — do NOT include audio questions unless audio content is provided)
${unit.video_url ? `YouTube: ${unit.video_url}` : "(none)"}${unit.video_storage_path ? `\nUploaded video: yes` : ""}

## Learn vocabulary
${vocabList || "(none)"}

## Grammar
${grammarList || "(none)"}

## Task
Produce EXACTLY 10 diverse questions with this distribution:
- 3 questions grounded in the LESSON TOPIC (comprehension, inference, event ordering).
- 3 questions grounded in LEARN VOCABULARY (vocab_in_context, matching, sentence_ordering — not simple recall).
- 2 questions grounded in GRAMMAR (grammar_selection, identifying incorrect usage, sentence_ordering).
- 2 ORIGINAL reasoning questions combining topic + vocab + grammar (best-response, conversation_completion, inference).

Question type must be one of:
  multiple_choice, grammar_selection, conversation_completion, vocab_in_context,
  fill_in_blank, sentence_ordering, matching, reading_comprehension.
Do NOT use "audio" — no audio files are attached.
Use at least 5 DIFFERENT question types across the 10 questions.

Intermediate difficulty rules (critical):
- Never test single-word recall. Always require understanding in context.
- Distractors must be plausible (near-synonyms, close grammar forms, sentences that are grammatical but wrong-meaning).
- Include at least one "identify the INCORRECT usage" question phrased as multiple_choice.
- Include at least one reading_comprehension with a 2–4 sentence Arabic passage inferring meaning (not stated verbatim).
- Include at least one conversation_completion where the learner picks the best natural reply.
- Arabic text MUST have full tashkeel (harakat).
- Every question ends with a brief English "explanation" giving the reasoning, not just the answer.

Format rules per type:
- multiple_choice / grammar_selection / conversation_completion / vocab_in_context: 4 options, correct_answer is a string that matches ONE option exactly.
- fill_in_blank: question contains "____"; options is 4 candidate fills; correct_answer is the correct fill string.
- sentence_ordering: options is the shuffled tokens (array of strings); correct_answer is the tokens in correct order (array of strings).
- matching: options is an array of 4 {left,right} pairs shown to the learner shuffled; correct_answer is the SAME object as {"left":"right", ...} mapping.
- reading_comprehension: include "passage" (Arabic, 2–4 sentences); options is 4; correct_answer is one option string.

Return STRICT JSON only, no prose, no markdown fences:
{
  "questions": [
    {
      "order_index": 1,
      "question_type": "multiple_choice" | "grammar_selection" | "conversation_completion" | "vocab_in_context" | "fill_in_blank" | "sentence_ordering" | "matching" | "reading_comprehension",
      "question": "string",
      "passage": "string or null",
      "options": ["...","..."] | [{"left":"...","right":"..."}, ...],
      "correct_answer": "string" | ["...","..."] | {"left":"right", ...},
      "explanation": "string"
    }
  ]
}`;

    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a precise Arabic-language test author. Output valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!gwRes.ok) {
      const body = await gwRes.text();
      console.error(`AI Gateway error [${gwRes.status}]: ${body}`);
      return json({ error: "AI generation failed", status: gwRes.status, details: body }, gwRes.status);
    }

    const gwJson = await gwRes.json();
    const raw = gwJson.choices?.[0]?.message?.content ?? "";
    let parsedOutput: any;
    try {
      parsedOutput = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsedOutput = JSON.parse(cleaned);
    }
    const questions: any[] = parsedOutput?.questions ?? [];
    if (!Array.isArray(questions) || questions.length === 0) {
      return json({ error: "AI returned no questions", raw }, 502);
    }

    // Wipe existing generated set so admin has a clean list.
    await admin.from("flashcard_unit_tests").delete().eq("unit_id", unit_id);

    const rows = questions.map((q, i) => ({
      unit_id,
      order_index: q.order_index ?? i + 1,
      question_type: ALLOWED_TYPES.includes(q.question_type) ? q.question_type : "multiple_choice",
      question: String(q.question ?? "").slice(0, 2000),
      passage: q.passage ?? null,
      options: q.options ?? null,
      correct_answer: q.correct_answer ?? "",
      explanation: q.explanation ?? null,
      published: true,
    }));

    const { error: insErr } = await admin.from("flashcard_unit_tests").insert(rows);
    if (insErr) {
      console.error("Insert failed", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({ inserted: rows.length });
  } catch (e: any) {
    console.error("generate-intermediate-test crashed", e);
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
