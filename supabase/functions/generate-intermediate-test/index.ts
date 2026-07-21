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

    const prompt = `You are an experienced Arabic language TEACHER preparing a LESSON REVIEW for students who just finished this specific lesson. You are NOT inventing a new exam. You are checking whether the learner remembers and can use WHAT WAS TAUGHT IN THIS LESSON — nothing else.

============================================================
## SOURCE OF TRUTH (ABSOLUTE)
============================================================
The ONLY source for generating questions is THIS lesson's materials, listed below:
  • Lesson topic / transcript (if provided)
  • Learn vocabulary cards
  • Grammar cards
  • Listening content (the lesson video)

If a concept, word, meaning, rule, fact, name, or idea is NOT present in the materials below, you MUST NOT ask about it. No exceptions.

Every question you produce MUST be traceable to a specific lesson item. Internally you must be able to name:
  - which vocabulary card it came from, OR
  - which grammar card it came from, OR
  - which sentence / example it came from, OR
  - which listening segment it came from.
If you cannot map a question to a specific item from the materials, DELETE it and write a different one.

============================================================
## LESSON MATERIALS (the ONLY allowed source)
============================================================

## Unit
Title (EN): ${unit.title_en}
Title (AR): ${unit.title_ar ?? ""}

## Lesson topic / transcript
${unit.lesson_topic ?? "(none provided — do not invent one)"}

## Listening resource
${hasVideo ? (unit.video_url ? `YouTube: ${unit.video_url}` : "Uploaded video attached") : "(no video — do NOT produce listening_comprehension questions)"}

## Learn vocabulary (${learn.length} cards, ${cardsWithImages.length} with images)
${vocabList || "(none)"}

## Vocabulary cards with images (only these image URLs may be used)
${imageList || "(none available — do NOT produce image_question / choose_correct_sentence)"}

## Grammar (${grammar.length} concepts)
${grammarList || "(none — do NOT invent grammar rules)"}

${previousList ? `## Previously generated questions for this unit (DO NOT REPEAT — vary wording and target different items)
${previousList}
` : ""}
============================================================
## BEGINNER IS THE REFERENCE — MATCH ITS STYLE
============================================================
Before writing, imagine the Beginner-level assessments on this platform. They are:
  - Short, plain, and direct ("What does X mean?", "Choose the correct word", "Complete the sentence with the right form").
  - Focused on recognition and correct usage of items the learner just studied.
  - Free of trick wording, riddles, or clever framing.
  - Free of cultural/general-knowledge trivia.

Match that tone. Do NOT invent a new, more literary, or more "creative" assessment style. This is Intermediate, so the vocabulary and grammar are more advanced, but the QUESTION STYLE stays plain and lesson-anchored.

============================================================
## FORBIDDEN — never ask about
============================================================
  ✗ Anything not present in the materials above.
  ✗ Hidden or implied details ("what is the speaker really thinking?").
  ✗ Character motivations, feelings, or backstory not stated in the lesson.
  ✗ Future events / "what happens next?".
  ✗ General knowledge, world facts, geography, history.
  ✗ Cultural knowledge that was not explicitly taught in this lesson.
  ✗ Logical inference beyond the lesson content.
  ✗ "Why do you think ...?" or opinion questions.
  ✗ Any fact the learner would have to guess or bring from outside.

If in doubt, drop the question.

============================================================
## QUESTION DESIGN
============================================================
Produce EXACTLY ${TARGET_QUESTIONS} questions.

For each question:
  1. Pick ONE specific lesson item (vocab card / grammar card / sentence / listening line).
  2. Write a plain, Beginner-style question that checks whether the learner recognizes or can correctly use that exact item.
  3. Record which item it came from in "lesson_concepts" and (as applicable) "vocabulary_used" / "grammar_concepts_used". These fields MUST contain strings that appear in the materials above — exactly, not paraphrased.
  4. The correct answer must be verifiable directly from the materials.

Blueprint (target mix, adapt only to what the lesson supports):
${blueprintText}

Skip any blueprint type whose required source material is missing (e.g. no images → skip image_question; no video → skip listening_comprehension; no grammar cards → skip grammar_selection / find_the_mistake).

## Distractors
Distractors must model realistic learner mistakes drawn from the SAME lesson pool when possible:
  - another vocab item from this lesson with a close but different meaning,
  - wrong gender / plural / tense / preposition of a taught form,
  - a grammatically valid but wrong-meaning sentence built from taught words.
Never use nonsense, unrelated words, or joke options. Never make the correct answer noticeably longer than the distractors.

## Quality rules
  - Arabic must be fully vowelized (tashkeel) and sound natural.
  - Do not test the same vocabulary item or grammar rule more than once directly.
  - Do not reuse question stems.
  - The correct answer must be defensible strictly from the lesson materials.

## Type formats (strict)
- multiple_choice / grammar_selection / conversation_completion / vocab_in_context / listening_comprehension / find_the_mistake / choose_correct_sentence / image_question: options is 4 strings; correct_answer is one option string.
- true_false: options is ["True","False"]; correct_answer is "True" or "False".
- fill_in_blank: question contains "____"; options is 4 candidate fills; correct_answer is one option string.
- sentence_ordering / word_ordering: options is shuffled tokens; correct_answer is tokens in correct order.
- matching: options is 4 {"left","right"} pairs; correct_answer is {"<left>":"<right>", ...}.
- reading_comprehension: "passage" is 2–4 Arabic sentences BUILT ONLY from taught vocabulary/grammar; options 4; correct_answer one option.
- image_question / choose_correct_sentence: "image_url" MUST be one of the URLs listed above.

## Teaching explanation
"teaching_explanation" (2–4 English sentences): state why the correct answer is right by pointing to the specific lesson item, and why each key distractor is wrong. Keep the short "explanation" as a one-sentence justification.

## Learning objective (pick ONE)
vocabulary_recognition | vocabulary_usage | grammar_recognition | grammar_usage |
listening_comprehension | reading_comprehension | sentence_construction | word_order |
image_interpretation | context_understanding | everyday_communication

## Cognitive level
1=Recognition, 2=Recall, 3=Understanding, 4=Application. Intermediate should lean 2–3. Do NOT force higher-order inference if the lesson doesn't support it — recognition and correct usage of taught items is perfectly acceptable.

============================================================
## FINAL VALIDATION (do this silently before returning)
============================================================
For every question, verify:
  ✓ It maps to a specific item in the materials above.
  ✓ The correct answer can be found or directly derived from those materials.
  ✓ It does not depend on guessing, outside knowledge, or inference beyond the lesson.
  ✓ Its style matches the plain, direct Beginner tone described above.
If any check fails, DISCARD the question and write another. Return only questions that pass all four checks.

## Final set constraints
  - EXACTLY ${TARGET_QUESTIONS} questions.
  - Use only question types whose source material exists in this lesson.
  - No more than 2 consecutive questions of the same type.
  - No two questions may share the same primary vocabulary item or grammar rule.

## Output — STRICT JSON only, no prose, no markdown fences
{
  "questions": [
    {
      "order_index": 1,
      "question_type": "<one of the allowed types>",
      "question": "string",
      "passage": "string or null",
      "options": [...],
      "correct_answer": "string" | ["...","..."] | {"left":"right", ...},
      "explanation": "string",
      "teaching_explanation": "string",
      "image_url": "string or null",
      "difficulty": "easy" | "medium" | "hard",
      "learning_objective": "<one of the objectives listed above>",
      "cognitive_level": 1 | 2 | 3 | 4,
      "estimated_time_seconds": 20-180,
      "quality_score": 0-100,
      "skills_tested": ["reading","vocabulary","grammar","listening","writing"],
      "lesson_concepts": ["<exact string(s) from the materials>"],
      "vocabulary_used": ["<exact Arabic word(s) from the Learn vocabulary above>"],
      "grammar_concepts_used": ["<exact string(s) from the Grammar section above>"]
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
          { role: "system", content: "You are an experienced Arabic teacher preparing a LESSON REVIEW. You may only ask about content that appears in the lesson materials the user provides. Never invent facts, never test general knowledge, never ask about anything that was not explicitly taught. Match the plain, direct style of Beginner-level assessments — no clever framing, no inference beyond the lesson. Output valid JSON only." },
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

    // Drop low-quality questions the AI self-flagged, then enforce spacing.
    const passed = questions.filter((q: any) => {
      const s = Number(q?.quality_score);
      return !Number.isFinite(s) || s >= MIN_QUALITY_SCORE;
    });
    const pool = passed.length >= Math.min(TARGET_QUESTIONS, 6) ? passed : questions;

    const spaced = spaceConsecutiveTypes(shuffle(pool));
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
      teaching_explanation: q.teaching_explanation ?? null,
      image_url: q.image_url ?? null,
      difficulty: normalizeDifficulty(q.difficulty),
      learning_objective: normalizeObjective(q.learning_objective),
      cognitive_level: normalizeCognitiveLevel(q.cognitive_level),
      estimated_time_seconds: normalizeEstimatedTime(q.estimated_time_seconds),
      quality_score: normalizeQualityScore(q.quality_score),
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
