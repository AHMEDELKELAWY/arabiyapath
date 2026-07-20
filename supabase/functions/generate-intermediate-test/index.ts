// Generate an Intermediate-level Test using Lovable AI Gateway (Gemini 2.5 Pro).
//
// ARCHITECTURE
// ------------
// Adaptive Blueprint: analyze the lesson first, then decide which question
// types best fit. Vocabulary-heavy → more vocab questions, grammar-heavy →
// more grammar questions, image-rich → more image questions, listening-rich
// → more listening/reading. No rigid template; no more than 2 consecutive
// same-type questions.
//
// Every question is stored with admin-only metadata: skills_tested,
// lesson_concepts, vocabulary_used, grammar_concepts_used, difficulty,
// ai_version, generated_at. Learners never see this metadata.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";

const BodySchema = z.object({ unit_id: z.string().uuid() });

/** Native question types the runner supports. */
const ALLOWED_TYPES = [
  "multiple_choice",
  "grammar_selection",
  "conversation_completion",
  "vocab_in_context",
  "fill_in_blank",
  "sentence_ordering",
  "word_ordering",
  "matching",
  "reading_comprehension",
  "listening_comprehension",
  "true_false",
  "image_question",
  "choose_correct_sentence",
  "find_the_mistake",
] as const;

const AI_VERSION = "int-test/v3-pedagogical";
const MIN_QUALITY_SCORE = 70;
const TARGET_QUESTIONS = 10;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { unit_id } = parsed.data;

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

    // Gather context
    const { data: unit, error: unitErr } = await admin
      .from("flashcard_units")
      .select("id, title_en, title_ar, lesson_topic, video_url, video_storage_path")
      .eq("id", unit_id).single();
    if (unitErr || !unit) return json({ error: "unit not found" }, 404);

    const { data: learnCards } = await admin
      .from("flashcards")
      .select("arabic_text, transliteration, english_translation, notes, image_url")
      .eq("unit_id", unit_id).eq("kind", "learn").eq("published", true).limit(120);

    const { data: grammarCards } = await admin
      .from("flashcards")
      .select("arabic_text, english_translation, notes")
      .eq("unit_id", unit_id).eq("kind", "grammar").eq("published", true).limit(60);

    const { data: previousQs } = await admin
      .from("flashcard_unit_tests")
      .select("question")
      .eq("unit_id", unit_id)
      .limit(50);

    const learn = learnCards ?? [];
    const grammar = grammarCards ?? [];
    const cardsWithImages = learn.filter((c: any) => !!c.image_url);
    const hasVideo = !!(unit.video_url || unit.video_storage_path);

    /* ---------- Adaptive blueprint ---------- */
    const blueprint = buildBlueprint({
      vocabCount: learn.length,
      grammarCount: grammar.length,
      imageCount: cardsWithImages.length,
      hasListening: hasVideo,
      hasLessonTopic: !!(unit.lesson_topic && unit.lesson_topic.trim().length > 20),
    });

    const previousList = (previousQs ?? [])
      .map((r: any, i: number) => `${i + 1}. ${r.question}`).join("\n");

    const vocabList = learn.map((c: any) =>
      `- ${c.arabic_text}${c.transliteration ? ` (${c.transliteration})` : ""} = ${c.english_translation}${c.notes ? ` — ${c.notes}` : ""}${c.image_url ? ` [image]` : ""}`
    ).join("\n");
    const grammarList = grammar.map((c: any) =>
      `- ${c.arabic_text} — ${c.english_translation}${c.notes ? `\n  Note: ${c.notes}` : ""}`
    ).join("\n");
    const imageList = cardsWithImages.slice(0, 12).map((c: any) =>
      `- "${c.english_translation}" (${c.arabic_text}) → ${c.image_url}`
    ).join("\n");

    const blueprintText = blueprint
      .map((b) => `- ${b.count}× ${b.type} (${b.rationale})`).join("\n");

    const prompt = `You are a senior Arabic language curriculum designer creating an INTERMEDIATE (CEFR B1) assessment. Learners have mastered beginner drills — this test must feel meaningfully harder.

## Unit
Title (EN): ${unit.title_en}
Title (AR): ${unit.title_ar ?? ""}

## Lesson Topic
${unit.lesson_topic ?? "(none provided)"}

## Listening resource
${hasVideo ? (unit.video_url ? `YouTube: ${unit.video_url}` : "Uploaded video attached") : "(no video)"}

## Learn vocabulary (${learn.length} cards, ${cardsWithImages.length} with images)
${vocabList || "(none)"}

## Vocabulary cards that have images (use these for image_question / choose_correct_sentence / true_false about an image)
${imageList || "(none available)"}

## Grammar (${grammar.length} concepts)
${grammarList || "(none)"}

${previousList ? `## Previously generated questions (DO NOT REPEAT — vary wording, distractors, and framing)
${previousList}
` : ""}
## Adaptive blueprint — produce EXACTLY ${TARGET_QUESTIONS} questions in this mix
${blueprintText}

## Hard rules
- Allowed question_type values: ${ALLOWED_TYPES.join(", ")}.
- Use at least 5 DIFFERENT question types across the ${TARGET_QUESTIONS} questions.
- Never place more than 2 consecutive questions of the same type.
- Never repeat wording, distractors, or the same "correct answer" pattern across questions.
- Test understanding and inference. Never test single-word recall.
- Distractors must be plausible (near-synonyms, close grammar forms, sentences grammatical but wrong-meaning). Never obviously wrong.
- Do NOT quote lesson sentences verbatim unless testing listening or reading comprehension.
- Arabic must be fully vowelized (tashkeel).
- Every question ends with a brief English "explanation" giving the reasoning.

## Type formats
- multiple_choice / grammar_selection / conversation_completion / vocab_in_context / listening_comprehension / find_the_mistake / choose_correct_sentence / image_question: options is an array of 4 strings; correct_answer is one option string.
- true_false: options is exactly ["True","False"]; correct_answer is "True" or "False".
- fill_in_blank: question contains "____"; options is 4 candidate fills; correct_answer is one option string.
- sentence_ordering / word_ordering: options is the shuffled tokens (array of strings); correct_answer is the tokens in correct order (array of strings).
- matching: options is an array of 4 {"left","right"} pairs; correct_answer is {"<left>":"<right>", ...}.
- reading_comprehension: include "passage" (Arabic, 2–4 sentences); options is 4; correct_answer is one option string.
- image_question / choose_correct_sentence: set "image_url" to one of the URLs listed above.
- listening_comprehension: reference the lesson video content in "question" only (no audio file).

## Internal AI review before returning
Before finalizing each question, silently check:
  1. Is it too similar to another question in this test? If yes, rewrite.
  2. Does it test the same skill as the previous question? If yes, swap type.
  3. Are the distractors weak or obvious? If yes, strengthen.
  4. Does it test memorization instead of understanding? If yes, rewrite for inference.
  5. Does it duplicate a lesson sentence? If yes, paraphrase.
Return ONLY the final polished set.

## Output — STRICT JSON, no prose, no markdown fences
{
  "questions": [
    {
      "order_index": 1,
      "question_type": "<one of the allowed types>",
      "question": "string",
      "passage": "string or null",
      "options": [...] ,
      "correct_answer": "string" | ["...","..."] | {"left":"right", ...},
      "explanation": "string",
      "image_url": "string or null",
      "difficulty": "easy" | "medium" | "hard",
      "skills_tested": ["reading","vocabulary","grammar","listening","inference","writing"],
      "lesson_concepts": ["..."],
      "vocabulary_used": ["..."],
      "grammar_concepts_used": ["..."]
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
          { role: "system", content: "You are a precise Arabic-language test author. Output valid JSON only. Follow the adaptive blueprint exactly." },
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
    try { parsedOutput = JSON.parse(raw); }
    catch { parsedOutput = JSON.parse(raw.replace(/```json|```/g, "").trim()); }

    const questions: any[] = parsedOutput?.questions ?? [];
    if (!Array.isArray(questions) || questions.length === 0) {
      return json({ error: "AI returned no questions", raw }, 502);
    }

    /* ---------- Post-processing ---------- */

    // Fisher–Yates shuffle
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // Shuffle answer options for question types where option order is not meaningful.
    const optionOrderIsAnswer = new Set(["sentence_ordering", "word_ordering"]);
    const shuffleOptions = (q: any) => {
      if (
        !optionOrderIsAnswer.has(q.question_type) &&
        Array.isArray(q.options) &&
        q.options.every((o: any) => typeof o === "string")
      ) {
        q.options = shuffle(q.options);
      }
      return q;
    };

    // Enforce "no more than 2 consecutive same-type" after AI order.
    const spaced = spaceConsecutiveTypes(shuffle(questions));
    const finalQuestions = spaced.map(shuffleOptions);

    // Wipe existing draft
    await admin.from("flashcard_unit_tests").delete().eq("unit_id", unit_id);

    const nowIso = new Date().toISOString();
    const rows = finalQuestions.map((q, i) => ({
      unit_id,
      order_index: i + 1,
      question_type: (ALLOWED_TYPES as readonly string[]).includes(q.question_type)
        ? q.question_type : "multiple_choice",
      question: String(q.question ?? "").slice(0, 2000),
      passage: q.passage ?? null,
      options: q.options ?? null,
      correct_answer: q.correct_answer ?? "",
      explanation: q.explanation ?? null,
      image_url: q.image_url ?? null,
      difficulty: normalizeDifficulty(q.difficulty),
      skills_tested: toStrArr(q.skills_tested),
      lesson_concepts: toStrArr(q.lesson_concepts),
      vocabulary_used: toStrArr(q.vocabulary_used),
      grammar_concepts_used: toStrArr(q.grammar_concepts_used),
      ai_version: AI_VERSION,
      generated_at: nowIso,
      published: true,
    }));

    const { error: insErr } = await admin.from("flashcard_unit_tests").insert(rows);
    if (insErr) {
      console.error("Insert failed", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({ inserted: rows.length, blueprint });
  } catch (e: any) {
    console.error("generate-intermediate-test crashed", e);
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

/* ============================ helpers ============================ */

interface BlueprintEntry { type: string; count: number; rationale: string; }

/**
 * Adaptive blueprint. Weight question types by what the lesson actually
 * contains, then normalize to TARGET_QUESTIONS with at least 5 types.
 */
function buildBlueprint(ctx: {
  vocabCount: number;
  grammarCount: number;
  imageCount: number;
  hasListening: boolean;
  hasLessonTopic: boolean;
}): BlueprintEntry[] {
  const weights: Record<string, { w: number; rationale: string }> = {};
  const add = (t: string, w: number, r: string) => {
    if (w <= 0) return;
    weights[t] = { w: (weights[t]?.w ?? 0) + w, rationale: weights[t]?.rationale ?? r };
  };

  // Vocabulary
  if (ctx.vocabCount >= 5) {
    add("vocab_in_context", Math.min(3, Math.ceil(ctx.vocabCount / 8)), "vocab-heavy lesson");
    add("matching", 1, "match vocab ↔ meaning");
    add("fill_in_blank", 1, "vocab recall in context");
  }

  // Grammar
  if (ctx.grammarCount >= 1) {
    add("grammar_selection", Math.min(3, Math.max(1, ctx.grammarCount)), "grammar concepts present");
    add("find_the_mistake", 1, "identify grammar mistake");
  }

  // Reading / topic
  if (ctx.hasLessonTopic) {
    add("reading_comprehension", 2, "lesson topic available");
    add("conversation_completion", 1, "inference from topic");
  } else {
    add("reading_comprehension", 1, "generic comprehension");
  }

  // Listening
  if (ctx.hasListening) {
    add("listening_comprehension", 2, "video content available");
  }

  // Images
  if (ctx.imageCount >= 2) {
    add("image_question", Math.min(2, Math.ceil(ctx.imageCount / 4)), "vocab has images");
    add("choose_correct_sentence", 1, "image → sentence match");
  }

  // Universal
  add("true_false", 1, "quick true/false check");
  add("sentence_ordering", 1, "sentence construction");
  add("multiple_choice", 1, "inference reasoning");

  // Normalize to TARGET_QUESTIONS
  const entries = Object.entries(weights).map(([type, v]) => ({
    type, count: v.w, rationale: v.rationale,
  }));
  entries.sort((a, b) => b.count - a.count);

  const totalWeight = entries.reduce((s, e) => s + e.count, 0);
  const scaled = entries.map((e) => ({
    ...e,
    count: Math.max(1, Math.round((e.count / totalWeight) * TARGET_QUESTIONS)),
  }));

  // Adjust to exactly TARGET_QUESTIONS
  let sum = scaled.reduce((s, e) => s + e.count, 0);
  while (sum > TARGET_QUESTIONS) {
    // Trim from lowest-priority entries with count > 1
    for (let i = scaled.length - 1; i >= 0 && sum > TARGET_QUESTIONS; i--) {
      if (scaled[i].count > 1) { scaled[i].count--; sum--; }
    }
    if (scaled.every((e) => e.count === 1) && sum > TARGET_QUESTIONS) {
      scaled.pop(); sum = scaled.reduce((s, e) => s + e.count, 0);
    }
  }
  while (sum < TARGET_QUESTIONS) {
    scaled[0].count++; sum++;
  }

  // Guarantee ≥ 5 distinct types
  if (scaled.length < 5) {
    const fillers = ["true_false", "sentence_ordering", "multiple_choice", "matching", "fill_in_blank"]
      .filter((t) => !scaled.some((e) => e.type === t));
    while (scaled.length < 5 && fillers.length) {
      scaled.push({ type: fillers.shift()!, count: 1, rationale: "diversity filler" });
      // Rebalance: steal from the largest bucket
      scaled.sort((a, b) => b.count - a.count);
      if (scaled[0].count > 1) scaled[0].count--;
    }
  }

  return scaled;
}

/** Reorder so no more than 2 consecutive same-type questions appear. */
function spaceConsecutiveTypes<T extends { question_type?: string }>(list: T[]): T[] {
  const arr = list.slice();
  const MAX_RUN = 2;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let i = MAX_RUN; i < arr.length; i++) {
      const t = arr[i].question_type;
      const same =
        arr[i - 1]?.question_type === t &&
        arr[i - 2]?.question_type === t;
      if (!same) continue;
      // find a later item with a different type
      const j = arr.findIndex((q, k) => k > i && q.question_type !== t);
      if (j > i) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        moved = true;
      }
    }
    if (!moved) break;
  }
  return arr;
}

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
