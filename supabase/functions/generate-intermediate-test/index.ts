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

const AI_VERSION = "int-test/v5-pool-of-20";
const MIN_QUALITY_SCORE = 70;
const TARGET_QUESTIONS = 20;
// Pool distribution (must sum to TARGET_QUESTIONS when all categories present).
const POOL_MIX = { listening: 8, vocabulary: 6, grammar: 6 } as const;
const MC_OPTION_TYPES = new Set([
  "multiple_choice",
  "grammar_selection",
  "conversation_completion",
  "vocab_in_context",
  "listening_comprehension",
  "reading_comprehension",
  "choose_correct_sentence",
  "image_question",
  "fill_in_blank",
]);
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

    /* ---------- Fixed pool distribution (8/6/6, redistribute if missing) ---------- */
    const distribution = buildDistribution({
      hasListening: hasVideo,
      hasGrammar: grammar.length >= 1,
      hasVocabulary: learn.length >= 1,
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

    const distributionText =
      `- ${distribution.listening} listening question(s)\n` +
      `- ${distribution.vocabulary} vocabulary question(s)\n` +
      `- ${distribution.grammar} grammar question(s)`;

    const prompt = `You are writing a SIMPLE lesson review for students who just finished this specific lesson. This is NOT an exam. It is a friendly, confidence-building check that the learner remembers what was just taught.

Match the style of Beginner-level assessments on this platform:
  • Short, plain, and direct.
  • One idea per question. No multi-step reasoning.
  • No clever framing, no trick wording, no "gotchas".
  • The learner should finish thinking "these questions are exactly about what I just learned" — not "this was a hard language exam".

============================================================
## SOURCE OF TRUTH (ABSOLUTE — DO NOT REMOVE)
============================================================
The ONLY source for questions is THIS lesson's materials below:
  • Lesson topic / transcript (if provided)
  • Learn vocabulary cards
  • Grammar cards
  • Listening content (the lesson video)

If a concept, word, meaning, rule, fact, or name is NOT present in the materials below, you MUST NOT ask about it.

Every question MUST be traceable to a specific lesson item (a specific vocab card, grammar card, sentence, or listening segment). Record that item in "lesson_concepts" / "vocabulary_used" / "grammar_concepts_used" using strings that appear in the materials exactly.

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

${previousList ? `## Previously generated questions for this unit (vary wording, target different items)
${previousList}
` : ""}
============================================================
## WHAT TO ASK (Beginner-style question bank)
============================================================
Prefer these plain, direct question styles:
  • Vocabulary meaning ("What does X mean?")
  • Choose the correct image for a word
  • Listening: what did the speaker say / which word did you hear
  • Reading: a very short sentence from the lesson, one direct comprehension question
  • Fill in the blank with a taught word or taught grammar form
  • Word order / sentence order using taught words
  • True / False about something explicitly taught
  • Choose the correct sentence
  • Matching word ↔ meaning (or word ↔ image)

============================================================
## FORBIDDEN
============================================================
  ✗ Anything not present in the materials above.
  ✗ Hidden or implied details, character motivations, "why do you think…", opinion questions.
  ✗ Future events / "what happens next?".
  ✗ General knowledge, world facts, geography, history.
  ✗ Cultural knowledge that was not explicitly taught in this lesson.
  ✗ Multi-step reasoning or inference chains.
  ✗ Clever wording, riddles, double negatives, "which is NOT…" traps.
  ✗ Making the correct answer noticeably longer than the distractors.

If in doubt, drop the question and pick a simpler one about the same lesson item.

============================================================
## QUESTION DESIGN
============================================================
Produce EXACTLY ${TARGET_QUESTIONS} questions.

For each question:
  1. Pick ONE specific lesson item (vocab card / grammar card / sentence / listening line).
  2. Write a plain, Beginner-style question that checks whether the learner recognizes or can correctly use that exact item.
  3. The correct answer must be directly verifiable from the materials.

Blueprint (target mix, adapt only to what the lesson supports):
${blueprintText}

Skip any blueprint type whose required source material is missing (e.g. no images → skip image_question; no video → skip listening_comprehension; no grammar cards → skip grammar_selection).

## Distractors
Simple, plausible, drawn from the SAME lesson pool:
  • another taught vocab item,
  • a wrong but taught form of the same word,
  • a short taught phrase that doesn't fit.
Never nonsense, never unrelated, never obvious joke options. Do NOT craft "very close" or minimally-different distractors designed to trick the learner. The goal is a fair, clear check — not a difficult discrimination task.

## Quality rules
  • Arabic must be fully vowelized (tashkeel) and sound natural.
  • Do not test the same vocabulary item or grammar rule twice.
  • Do not reuse question stems.
  • Every correct answer must be defensible strictly from the lesson materials.

## Type formats (strict)
- multiple_choice / grammar_selection / conversation_completion / vocab_in_context / listening_comprehension / choose_correct_sentence / image_question: options is 4 strings; correct_answer is one option string.
- true_false: options is ["True","False"]; correct_answer is "True" or "False".
- fill_in_blank: question contains "____"; options is 4 candidate fills; correct_answer is one option string.
- sentence_ordering / word_ordering: options is shuffled tokens; correct_answer is tokens in correct order.
- matching: options is 4 {"left","right"} pairs; correct_answer is {"<left>":"<right>", ...}.
- reading_comprehension: "passage" is 1–3 short Arabic sentences BUILT ONLY from taught vocabulary/grammar; options 4; correct_answer one option. Ask a direct comprehension question (who/what/where), not inference.
- image_question / choose_correct_sentence: "image_url" MUST be one of the URLs listed above.

## Explanation
"explanation" (1–2 short English sentences): plainly state why the correct answer is right by pointing to the specific lesson item. Keep "teaching_explanation" short and friendly — no jargon, no cognitive-science framing.

## Difficulty
Almost all questions should be "easy" or "medium". Do NOT produce "hard" questions unless the lesson content itself is unavoidably complex. Intermediate here means the vocabulary is more advanced than Beginner — the QUESTION STYLE stays plain and lesson-anchored.

## Learning objective (pick ONE, informational only)
vocabulary_recognition | vocabulary_usage | grammar_recognition | grammar_usage |
listening_comprehension | reading_comprehension | sentence_construction | word_order |
image_interpretation | context_understanding | everyday_communication

============================================================
## FINAL VALIDATION (silent, before returning)
============================================================
For every question, verify:
  ✓ It maps to a specific item in the materials above.
  ✓ The correct answer can be found or directly derived from those materials.
  ✓ It does not depend on guessing, outside knowledge, or inference beyond the lesson.
  ✓ Its style matches the plain, direct Beginner tone described above — a learner who just finished the lesson should feel confident, not tested.
If any check fails, DISCARD the question and write a simpler one.

## Final set constraints
  • EXACTLY ${TARGET_QUESTIONS} questions.
  • Use only question types whose source material exists in this lesson.
  • No more than 2 consecutive questions of the same type.
  • No two questions may share the same primary vocabulary item or grammar rule.

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
      "difficulty": "easy" | "medium",
      "learning_objective": "<one of the objectives listed above>",
      "cognitive_level": 1 | 2,
      "estimated_time_seconds": 15-90,
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
          { role: "system", content: "You write SIMPLE, Beginner-style lesson reviews for Arabic learners. Only ask about content that appears in the lesson materials the user provides. Never invent facts, never test general knowledge, never ask about anything not explicitly taught. Keep questions short, plain, and confidence-building — no clever framing, no inference beyond the lesson, no tricky distractors. Output valid JSON only." },
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

    // Build a normalized haystack of everything actually taught in this lesson.
    // A question is only kept if it can be traced to at least one token from
    // this haystack via vocabulary_used / grammar_concepts_used / lesson_concepts.
    const stripTashkeel = (s: string) => (s ?? "").replace(/[\u064B-\u065F\u0670]/g, "");
    const norm = (s: string) => stripTashkeel(String(s ?? "")).toLowerCase().trim();
    const lessonHaystackParts: string[] = [];
    for (const c of learn) {
      lessonHaystackParts.push(c.arabic_text ?? "", c.english_translation ?? "", c.transliteration ?? "", c.notes ?? "");
    }
    for (const c of grammar) {
      lessonHaystackParts.push(c.arabic_text ?? "", c.english_translation ?? "", c.notes ?? "");
    }
    lessonHaystackParts.push(unit.title_en ?? "", unit.title_ar ?? "", unit.lesson_topic ?? "");
    const lessonHaystack = norm(lessonHaystackParts.join(" \n "));
    const isGrounded = (q: any) => {
      const tokens: string[] = [
        ...toStrArr(q.vocabulary_used),
        ...toStrArr(q.grammar_concepts_used),
        ...toStrArr(q.lesson_concepts),
      ];
      if (tokens.length === 0) return false;
      return tokens.some((t) => {
        const n = norm(t);
        return n.length >= 2 && lessonHaystack.includes(n);
      });
    };

    // Drop low-quality AND ungrounded questions, then enforce spacing.
    const passed = questions.filter((q: any) => {
      const s = Number(q?.quality_score);
      const qualityOk = !Number.isFinite(s) || s >= MIN_QUALITY_SCORE;
      return qualityOk && isGrounded(q);
    });
    const grounded = questions.filter(isGrounded);
    const pool = passed.length >= Math.min(TARGET_QUESTIONS, 6)
      ? passed
      : (grounded.length >= Math.min(TARGET_QUESTIONS, 6) ? grounded : questions);

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

  // Vocabulary — favor plain recognition
  if (ctx.vocabCount >= 3) {
    add("multiple_choice", 2, "vocabulary meaning");
    add("matching", 1, "match vocab ↔ meaning");
    add("fill_in_blank", 1, "vocab recall in context");
    if (ctx.vocabCount >= 6) add("vocab_in_context", 1, "vocab used in a short sentence");
  }

  // Grammar — simple recognition, no "find the mistake" traps
  if (ctx.grammarCount >= 1) {
    add("grammar_selection", Math.min(2, Math.max(1, ctx.grammarCount)), "grammar concepts present");
    add("fill_in_blank", 1, "apply a taught grammar form");
  }

  // Reading / topic — short and direct
  if (ctx.hasLessonTopic) {
    add("reading_comprehension", 1, "direct comprehension of lesson text");
    add("true_false", 1, "true/false about lesson text");
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
  add("word_ordering", 1, "arrange taught words");
  add("multiple_choice", 1, "direct recognition");

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
