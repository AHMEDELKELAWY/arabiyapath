// Regenerate / transform a single Intermediate-test question in place.
//
// Supports these modes:
//   regenerate           — new question of the same type
//   easier               — same type, lower difficulty
//   harder               — same type, higher difficulty
//   improve_distractors  — keep question + correct answer, rewrite distractors
//   rewrite              — same type, rephrase the question in a fresh way
//   change_type          — convert to a different supported type (target_type)
//
// Preserves the row id and order_index. Does not touch other questions.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";

const ALLOWED_TYPES = [
  "multiple_choice","grammar_selection","conversation_completion",
  "vocab_in_context","fill_in_blank","sentence_ordering","word_ordering",
  "matching","reading_comprehension","listening_comprehension",
  "true_false","image_question","choose_correct_sentence","find_the_mistake",
] as const;

const MODES = ["regenerate","easier","harder","improve_distractors","rewrite","change_type"] as const;

const BodySchema = z.object({
  question_id: z.string().uuid(),
  mode: z.enum(MODES).optional().default("regenerate"),
  target_type: z.enum(ALLOWED_TYPES).optional(),
});

const AI_VERSION = "int-test/v3-pedagogical";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { question_id, mode, target_type } = parsed.data;

    // Admin check
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

    const { data: existing, error: qErr } = await admin
      .from("flashcard_unit_tests")
      .select("*")
      .eq("id", question_id)
      .single();
    if (qErr || !existing) return json({ error: "question not found" }, 404);

    const finalType =
      mode === "change_type" && target_type ? target_type : existing.question_type;

    const { data: unit } = await admin
      .from("flashcard_units")
      .select("id, title_en, title_ar, lesson_topic, video_url, video_storage_path")
      .eq("id", existing.unit_id).single();

    const { data: learnCards } = await admin
      .from("flashcards")
      .select("arabic_text, transliteration, english_translation, notes, image_url")
      .eq("unit_id", existing.unit_id).eq("kind", "learn").eq("published", true).limit(80);

    const { data: grammarCards } = await admin
      .from("flashcards")
      .select("arabic_text, english_translation, notes")
      .eq("unit_id", existing.unit_id).eq("kind", "grammar").eq("published", true).limit(40);

    const { data: siblings } = await admin
      .from("flashcard_unit_tests")
      .select("question")
      .eq("unit_id", existing.unit_id)
      .neq("id", question_id)
      .limit(30);

    const vocabList = (learnCards ?? []).map((c: any) =>
      `- ${c.arabic_text}${c.transliteration ? ` (${c.transliteration})` : ""} = ${c.english_translation}${c.notes ? ` — ${c.notes}` : ""}${c.image_url ? ` [image]` : ""}`
    ).join("\n");
    const grammarList = (grammarCards ?? []).map((c: any) =>
      `- ${c.arabic_text} — ${c.english_translation}${c.notes ? `\n  Note: ${c.notes}` : ""}`
    ).join("\n");
    const sibList = (siblings ?? [])
      .map((r: any, i: number) => `${i + 1}. ${r.question}`).join("\n");
    const imageList = (learnCards ?? []).filter((c: any) => c.image_url)
      .slice(0, 8).map((c: any) => `- "${c.english_translation}" → ${c.image_url}`).join("\n");

    /* ---------- Mode-specific instructions ---------- */
    const modeInstruction = (() => {
      switch (mode) {
        case "easier":
          return `Rewrite as an EASIER version of the same question (difficulty="easy"). Keep the same question_type. Use simpler vocabulary, more obvious context, and clearer distractors. Still test understanding — not pure recall.`;
        case "harder":
          return `Rewrite as a HARDER version of the same question (difficulty="hard"). Keep the same question_type. Require inference, subtler distinctions, or combined grammar+vocabulary reasoning. Distractors must be very close to the correct answer.`;
        case "improve_distractors":
          return `KEEP the original question text and correct_answer EXACTLY the same. ONLY replace the distractor options with more plausible ones (near-synonyms, close grammar forms, sentences that are grammatical but wrong-meaning). Do not weaken. correct_answer must remain in the options array.
Original question: ${JSON.stringify(existing.question)}
Original correct_answer: ${JSON.stringify(existing.correct_answer)}`;
        case "rewrite":
          return `Rewrite the question in a fresh way (new wording, new example sentence, new distractors) but keep the SAME question_type and the SAME underlying skill being tested. Preserve difficulty="${existing.difficulty ?? "medium"}".`;
        case "change_type":
          return `Convert the question to a DIFFERENT type: "${finalType}". Test a similar concept but adapt to that type's formatting rules. Preserve difficulty="${existing.difficulty ?? "medium"}".`;
        case "regenerate":
        default:
          return `Produce a NEW question of type "${finalType}" testing the same skill (or a related one) at difficulty="${existing.difficulty ?? "medium"}". Vary the wording, example, and distractors — do not repeat the previous version.`;
      }
    })();

    const prompt = `You are a senior Arabic curriculum designer regenerating ONE INTERMEDIATE (CEFR B1) test question.

## Unit
Title (EN): ${unit?.title_en ?? ""}
Title (AR): ${unit?.title_ar ?? ""}
Lesson topic: ${unit?.lesson_topic ?? "(none)"}
Video attached: ${unit?.video_url || unit?.video_storage_path ? "yes" : "no"}

## Learn vocabulary
${vocabList || "(none)"}

## Vocabulary with images
${imageList || "(none)"}

## Grammar
${grammarList || "(none)"}

${sibList ? `## Other questions already in this test (DO NOT REPEAT)
${sibList}
` : ""}
## Previous version of THIS question
Type: ${existing.question_type}
Question: ${existing.question}
Options: ${JSON.stringify(existing.options)}
Correct answer: ${JSON.stringify(existing.correct_answer)}

## Mode: ${mode}
${modeInstruction}

## Formatting rules (must follow for type "${finalType}")
- multiple_choice / grammar_selection / conversation_completion / vocab_in_context / listening_comprehension / find_the_mistake / choose_correct_sentence / image_question: options is 4 strings; correct_answer is one option string.
- true_false: options = ["True","False"]; correct_answer = "True" or "False".
- fill_in_blank: question contains "____"; options is 4 candidate fills; correct_answer is the correct fill.
- sentence_ordering / word_ordering: options is shuffled tokens array; correct_answer is tokens in correct order.
- matching: options is 4 {"left","right"} pairs; correct_answer is {"left":"right",...}.
- reading_comprehension: include a 2–4 sentence Arabic "passage"; 4 options; correct_answer is one option.
- image_question / choose_correct_sentence: set "image_url" to one of the listed image URLs above.

Fully vowelized Arabic (tashkeel). Plausible distractors. Brief English explanation.

Return STRICT JSON only:
{
  "question_type": "${finalType}",
  "question": "string",
  "passage": "string or null",
  "options": [...],
  "correct_answer": "string" | ["...","..."] | {"left":"right", ...},
  "explanation": "string",
  "image_url": "string or null",
  "difficulty": "easy" | "medium" | "hard",
  "skills_tested": ["..."],
  "lesson_concepts": ["..."],
  "vocabulary_used": ["..."],
  "grammar_concepts_used": ["..."]
}`;

    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
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
      return json({ error: "AI generation failed", details: body }, gwRes.status);
    }

    const gwJson = await gwRes.json();
    const raw = gwJson.choices?.[0]?.message?.content ?? "";
    let q: any;
    try { q = JSON.parse(raw); }
    catch { q = JSON.parse(raw.replace(/```json|```/g, "").trim()); }

    const patch: Record<string, unknown> = {
      question_type: (ALLOWED_TYPES as readonly string[]).includes(q.question_type)
        ? q.question_type : finalType,
      question: String(q.question ?? "").slice(0, 2000),
      passage: q.passage ?? null,
      options: q.options ?? null,
      correct_answer: q.correct_answer ?? "",
      explanation: q.explanation ?? null,
      image_url: q.image_url ?? existing.image_url ?? null,
      difficulty: normalizeDifficulty(q.difficulty ?? existing.difficulty),
      skills_tested: toStrArr(q.skills_tested),
      lesson_concepts: toStrArr(q.lesson_concepts),
      vocabulary_used: toStrArr(q.vocabulary_used),
      grammar_concepts_used: toStrArr(q.grammar_concepts_used),
      ai_version: AI_VERSION,
      generated_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("flashcard_unit_tests")
      .update(patch)
      .eq("id", question_id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, mode });
  } catch (e: any) {
    console.error("regenerate-intermediate-question crashed", e);
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

function normalizeDifficulty(d: any): string {
  const v = String(d ?? "medium").toLowerCase();
  return ["easy", "medium", "hard"].includes(v) ? v : "medium";
}

function toStrArr(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean).slice(0, 20);
  return [String(v)];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
