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

const AI_VERSION = "int-test/v4-beginner-style";
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
          return `Rewrite as an EASIER version of the same question (difficulty="easy"). Keep the same question_type. Use the most obvious taught vocabulary, very clear context, and clearly wrong distractors. Pure recognition is fine.`;
        case "harder":
          return `Rewrite as a slightly firmer version of the same question (difficulty="medium"). Keep the same question_type. Stay in the plain Beginner style — do NOT add inference, trick wording, near-identical distractors, or multi-step reasoning. "Harder" here just means the correct answer is not immediately obvious at a glance, while the question itself remains simple and lesson-anchored.`;
        case "improve_distractors":
          return `KEEP the original question text and correct_answer EXACTLY the same. ONLY replace the distractor options with plausible ones drawn from the SAME lesson (other taught vocab items, other taught forms). Distractors should be clearly wrong on reflection, not near-identical traps. correct_answer must remain in the options array.
Original question: ${JSON.stringify(existing.question)}
Original correct_answer: ${JSON.stringify(existing.correct_answer)}`;
        case "rewrite":
          return `Rewrite the question in a fresh way (new wording, new example, new distractors) but keep the SAME question_type and the SAME underlying skill being tested. Stay in plain Beginner style. Preserve difficulty="${existing.difficulty ?? "medium"}".`;
        case "change_type":
          return `Convert the question to a DIFFERENT type: "${finalType}". Test the same taught item, adapted to that type's formatting rules. Stay in plain Beginner style. Preserve difficulty="${existing.difficulty ?? "medium"}".`;
        case "regenerate":
        default:
          return `Produce a NEW question of type "${finalType}" testing the same taught item (or a closely related one) at difficulty="${existing.difficulty ?? "medium"}". Vary the wording, example, and distractors — do not repeat the previous version. Stay in plain Beginner style.`;
      }
    })();

    const prompt = `You are regenerating ONE question for a SIMPLE lesson review. This is not an exam. It is a friendly, confidence-building check that the learner remembers what was just taught.

Match the style of Beginner-level assessments on this platform: short, plain, direct, one idea per question, no clever framing, no trick wording, no multi-step reasoning. The learner should feel "this is exactly what I just learned".

============================================================
## SOURCE OF TRUTH (ABSOLUTE — DO NOT REMOVE)
============================================================
The ONLY allowed source is this lesson's materials below (transcript, Learn vocabulary, Grammar cards, Listening/video). If a concept, word, meaning, rule, name, or fact is NOT present below, you MUST NOT ask about it.

Every question must be traceable to a specific item from the materials (a specific vocab card, grammar card, sentence, or listening segment). Record it in "lesson_concepts" / "vocabulary_used" / "grammar_concepts_used" using strings that appear in the materials exactly.

## Forbidden
Never ask about: information not taught, hidden details, character motivations, future events, general knowledge, cultural trivia not in the lesson, "why do you think…", opinion questions, "which is NOT…" traps, or anything requiring guessing beyond the lesson.

============================================================
## LESSON MATERIALS (the ONLY allowed source)
============================================================

## Unit
Title (EN): ${unit?.title_en ?? ""}
Title (AR): ${unit?.title_ar ?? ""}
Lesson topic / transcript: ${unit?.lesson_topic ?? "(none — do not invent one)"}
Video attached: ${unit?.video_url || unit?.video_storage_path ? "yes" : "no (do NOT produce listening_comprehension)"}

## Learn vocabulary
${vocabList || "(none)"}

## Vocabulary with images (only these image URLs may be used)
${imageList || "(none)"}

## Grammar
${grammarList || "(none — do NOT invent grammar rules)"}

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
- reading_comprehension: 2–4 Arabic-sentence "passage" built ONLY from taught vocabulary/grammar; 4 options; correct_answer is one option.
- image_question / choose_correct_sentence: "image_url" MUST be one of the listed URLs above.

## Distractors
Simple, plausible, drawn from the SAME lesson pool (other taught vocab items, other taught forms of the same word, a short taught phrase that doesn't fit). Never nonsense, never unrelated. Do NOT craft near-identical distractors designed to trick the learner — this is a fair check, not a discrimination task. Fully vowelize Arabic.

## Teaching explanation
"teaching_explanation" (1–2 short English sentences) points to the specific lesson item and plainly says why the correct answer is right. Friendly tone, no jargon.

## Final validation (silent)
Before returning: (1) the question maps to a specific item in the materials above; (2) the correct answer is verifiable from those materials; (3) no outside knowledge or inference is required; (4) the tone matches plain Beginner-style assessment wording. If any check fails, rewrite.

Return STRICT JSON only:
{
  "question_type": "${finalType}",
  "question": "string",
  "passage": "string or null",
  "options": [...],
  "correct_answer": "string" | ["...","..."] | {"left":"right", ...},
  "explanation": "string",
  "teaching_explanation": "string",
  "image_url": "string or null",
  "difficulty": "easy" | "medium" | "hard",
  "learning_objective": "<one of: vocabulary_recognition | vocabulary_usage | grammar_recognition | grammar_usage | listening_comprehension | reading_comprehension | sentence_construction | word_order | image_interpretation | context_understanding | everyday_communication>",
  "cognitive_level": 1 | 2 | 3 | 4,
  "estimated_time_seconds": 20-180,
  "quality_score": 0-100,
  "skills_tested": ["..."],
  "lesson_concepts": ["<exact string(s) from the materials above>"],
  "vocabulary_used": ["<exact Arabic word(s) from the Learn vocabulary above>"],
  "grammar_concepts_used": ["<exact string(s) from the Grammar section above>"]
}`;


    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You regenerate ONE Beginner-style question for a simple Arabic lesson review. Only ask about content that appears in the lesson materials the user provides. Never invent facts, never test general knowledge, never ask about anything not explicitly taught. Keep the question short, plain, and confidence-building — no clever framing, no inference, no tricky distractors. Output valid JSON only." },
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
      teaching_explanation: q.teaching_explanation ?? null,
      image_url: q.image_url ?? existing.image_url ?? null,
      difficulty: normalizeDifficulty(q.difficulty ?? existing.difficulty),
      learning_objective: normalizeObjective(q.learning_objective),
      cognitive_level: normalizeCognitiveLevel(q.cognitive_level),
      estimated_time_seconds: normalizeEstimatedTime(q.estimated_time_seconds),
      quality_score: normalizeQualityScore(q.quality_score),
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

const OBJECTIVES = new Set([
  "vocabulary_recognition","vocabulary_usage","grammar_recognition","grammar_usage",
  "listening_comprehension","listening_inference","reading_comprehension","reading_inference",
  "sentence_construction","word_order","image_interpretation","context_understanding",
  "everyday_communication",
]);
function normalizeObjective(v: any): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().replace(/\s+/g, "_");
  return OBJECTIVES.has(s) ? s : null;
}
function normalizeCognitiveLevel(v: any): number | null {
  const n = Math.round(Number(v));
  return n >= 1 && n <= 4 ? n : null;
}
function normalizeEstimatedTime(v: any): number | null {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(10, Math.min(300, n));
}
function normalizeQualityScore(v: any): number | null {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
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
