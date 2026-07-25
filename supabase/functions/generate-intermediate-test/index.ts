// Generate an Intermediate-level Test pool using Lovable AI Gateway (Gemini 2.5 Pro).
//
// PHILOSOPHY (v7-source-grounded)
// -------------------------------
// The AI is NOT an author. It only transforms lesson content the admin already
// wrote into short, teacher-style questions.
//
// Lesson sources (the ONLY allowed sources):
//   1. Listening Transcript  (flashcard_units.listening_transcript)
//   2. Learn cards           (flashcards.kind = 'learn')
//   3. Grammar cards         (flashcards.kind = 'grammar')
//   4. Speaking cards        (flashcards.kind = 'speaking', optional)
//
// The pool size and per-source distribution are computed from the lesson itself
// — there are no fixed question counts. Every question is wording-checked and
// grounding-checked before it is saved. Listening questions are only accepted
// when they trace back to the transcript.
//
// Shared rules live in ../_shared/assessment-rules.ts and are used by the
// single-question regenerator too.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import {
  AI_VERSION,

  SOURCE_CONTRACT_PROMPT,
  SOURCE_TO_CATEGORY,
  TYPE_RULES_PROMPT,
  WORDING_RULES_PROMPT,
  buildLessonHaystack,
  checkWording,
  clampMcOptions,
  dedupeQuestions,
  isAllowedType,
  isGrounded,
  isListeningGrounded,
  normalizeCognitiveLevel,
  normalizeEstimatedTime,
  normalizeObjective,
  normalizeQualityScore,
  normalizeSource,
  shuffle,
  shuffleOptions,
  sourceLabel,
  toStrArr,
  type LessonSource,
} from "../_shared/assessment-rules.ts";

const BodySchema = z.object({ unit_id: z.string().uuid() });

const MIN_QUALITY_SCORE = 70;
/** Safety rails only — the real size comes from the lesson content. */
const POOL_MIN = 6;
const POOL_MAX = 40;
/** How many distinct questions one lesson item can reasonably support. */
const QUESTIONS_PER_CARD = 2;
const QUESTIONS_PER_TRANSCRIPT_LINE = 1.5;

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

    /* ------------------------- Gather lesson sources ------------------------ */

    const { data: unit, error: unitErr } = await admin
      .from("flashcard_units")
      .select("id, title_en, title_ar, lesson_topic, listening_transcript")
      .eq("id", unit_id).single();
    if (unitErr || !unit) return json({ error: "unit not found" }, 404);

    const [{ data: learnCards }, { data: grammarCards }, { data: speakingCards }] = await Promise.all([
      admin.from("flashcards")
        .select("arabic_text, transliteration, english_translation, notes, image_url")
        .eq("unit_id", unit_id).eq("kind", "learn").eq("published", true).limit(120),
      admin.from("flashcards")
        .select("arabic_text, english_translation, notes")
        .eq("unit_id", unit_id).eq("kind", "grammar").eq("published", true).limit(60),
      admin.from("flashcards")
        .select("arabic_text, transliteration, english_translation, notes")
        .eq("unit_id", unit_id).eq("kind", "speaking").eq("published", true).limit(60),
    ]);

    const learn = learnCards ?? [];
    const grammar = grammarCards ?? [];
    const speaking = speakingCards ?? [];
    const transcript = (unit.listening_transcript ?? "").trim() || null;
    const transcriptLines = transcript
      ? transcript.split(/\n+|(?<=[.!؟?])\s+/).map((l) => l.trim()).filter((l) => l.length > 1)
      : [];

    if (!transcript && learn.length === 0 && grammar.length === 0 && speaking.length === 0) {
      return json({ error: "This lesson has no content yet. Add a listening transcript or Learn / Grammar / Speaking cards first." }, 422);
    }

    const cardsWithImages = learn.filter((c: any) => !!c.image_url);

    /* ----------------- Dynamic pool size + source distribution ------------- */

    const weights: Record<LessonSource, number> = {
      listening: transcriptLines.length * QUESTIONS_PER_TRANSCRIPT_LINE,
      learn: learn.length * QUESTIONS_PER_CARD,
      grammar: grammar.length * QUESTIONS_PER_CARD,
      speaking: speaking.length * QUESTIONS_PER_CARD,
    };
    const { poolTarget, distribution } = buildDynamicDistribution(weights);

    /* ---------------------------- Prompt assembly -------------------------- */

    const { data: previousQs } = await admin
      .from("flashcard_unit_tests").select("question").eq("unit_id", unit_id).limit(60);
    const previousList = (previousQs ?? [])
      .map((r: any, i: number) => `${i + 1}. ${r.question}`).join("\n");

    const transcriptText = transcript
      ? transcriptLines.map((l, i) => `[L${i + 1}] ${l}`).join("\n")
      : "(no transcript — produce ZERO listening questions)";
    const vocabList = learn.map((c: any, i: number) =>
      `[Learn #${i + 1}] ${c.arabic_text}${c.transliteration ? ` (${c.transliteration})` : ""} = ${c.english_translation}${c.notes ? ` — ${c.notes}` : ""}${c.image_url ? " [image]" : ""}`
    ).join("\n");
    const grammarList = grammar.map((c: any, i: number) =>
      `[Grammar #${i + 1}] ${c.arabic_text} — ${c.english_translation}${c.notes ? `\n  Note: ${c.notes}` : ""}`
    ).join("\n");
    const speakingList = speaking.map((c: any, i: number) =>
      `[Speaking #${i + 1}] ${c.arabic_text} — ${c.english_translation}${c.notes ? ` — ${c.notes}` : ""}`
    ).join("\n");
    const imageList = cardsWithImages.slice(0, 12).map((c: any) =>
      `- "${c.english_translation}" (${c.arabic_text}) → ${c.image_url}`
    ).join("\n");

    const distributionText = (["listening", "learn", "grammar", "speaking"] as LessonSource[])
      .filter((s) => distribution[s] > 0)
      .map((s) => `- ${distribution[s]} question(s) from ${s === "listening" ? "the Listening Transcript" : `${s} cards`}`)
      .join("\n");

    const prompt = `You are a teacher checking what a student just learned in ONE specific lesson.
You are NOT writing new educational content. You only turn the lesson material below into short questions.

${SOURCE_CONTRACT_PROMPT}

============================================================
## LESSON MATERIALS
============================================================

## Unit (context only — never a question source)
Title (EN): ${unit.title_en}
Title (AR): ${unit.title_ar ?? ""}
Lesson topic: ${unit.lesson_topic ?? "(none)"}

## Listening Transcript (the ONLY source for listening questions)
${transcriptText}

## Learn cards (${learn.length})
${vocabList || "(none)"}

## Grammar cards (${grammar.length})
${grammarList || "(none — do NOT invent grammar rules)"}

## Speaking cards (${speaking.length})
${speakingList || "(none — skip speaking)"}

## Images available (only these URLs may be used)
${imageList || "(none — do NOT produce image_question)"}

${previousList ? `## Previously generated questions for this unit (use different wording and target different items)
${previousList}
` : ""}
============================================================
## HOW MANY
============================================================
Produce EXACTLY ${poolTarget} questions, distributed like this:
${distributionText}

Each lesson item may produce SEVERAL different questions from different angles
(meaning, usage, context, fill-in-the-blank, image, matching) — but every question
must stay short and must test something explicitly present in the materials.
Never repeat the same question twice with different wording.

${WORDING_RULES_PROMPT}

${TYPE_RULES_PROMPT}

## Explanation
"explanation" (1–2 short English sentences): state plainly why the correct answer
is right by pointing at the specific lesson item it came from.

## Learning objective (pick ONE, informational only)
vocabulary_recognition | vocabulary_usage | grammar_recognition | grammar_usage |
listening_comprehension | reading_comprehension | sentence_construction | word_order |
image_interpretation | context_understanding | everyday_communication

============================================================
## SILENT FINAL CHECK (before returning)
============================================================
For every question verify:
  ✓ It comes from exactly ONE listed source, recorded in "source" / "source_index".
  ✓ Its answer is findable in that source. If not — replace the question.
  ✓ It is ONE short sentence with no instructional wording.
  ✓ MC-style types have exactly 3 options.
  ✓ Listening questions quote the transcript, never the title or lesson topic.

## Output — STRICT JSON only, no prose, no markdown fences
{
  "questions": [
    {
      "order_index": 1,
      "source": "listening" | "learn" | "grammar" | "speaking",
      "source_index": 0,
      "question_type": "<one of the allowed types>",
      "question": "string (ONE short sentence)",
      "passage": "string or null",
      "options": [...],
      "correct_answer": "string" | {"left":"right", ...},
      "explanation": "string",
      "teaching_explanation": "string",
      "image_url": "string or null",
      "difficulty": "easy",
      "learning_objective": "<one of the objectives listed above>",
      "cognitive_level": 1,
      "estimated_time_seconds": 15-60,
      "quality_score": 0-100,
      "skills_tested": ["reading","vocabulary","grammar","listening","speaking"],
      "lesson_concepts": ["<exact string(s) from the materials>"],
      "vocabulary_used": ["<exact Arabic word(s) from the materials>"],
      "grammar_concepts_used": ["<exact string(s) from the Grammar cards>"]
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
          {
            role: "system",
            content:
              "You are a teacher asking a student short questions about the lesson they just finished. You never invent content: every question must come from the lesson materials the user provides (listening transcript, learn cards, grammar cards, speaking cards). Questions are ONE short sentence in a natural teacher voice — never task instructions like 'complete the dialogue' or 'listen then choose'. Output valid JSON only.",
          },
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

    /* ---------------------------- Validation ------------------------------- */

    const haystack = buildLessonHaystack({ transcript, learn, grammar, speaking });
    const rejected: Record<string, number> = {};
    const reject = (reason: string) => { rejected[reason] = (rejected[reason] ?? 0) + 1; };

    const validated = questions.filter((q: any) => {
      if (!isAllowedType(q?.question_type)) { reject("forbidden_type"); return false; }

      const wording = checkWording(q?.question, q?.question_type);
      if (!wording.ok) { reject(`wording: ${wording.reason}`); return false; }

      const src = normalizeSource(q?.source) ?? inferSource(q);
      q.__source = src;

      if (src === "listening") {
        if (!transcript) { reject("listening_without_transcript"); return false; }
        if (!isListeningGrounded(q, transcript)) { reject("listening_not_in_transcript"); return false; }
      } else if (!isGrounded(q, haystack)) {
        reject("not_grounded"); return false;
      }

      // Speaking questions are only valid when speaking cards exist.
      if (src === "speaking" && speaking.length === 0) { reject("speaking_absent"); return false; }
      if (src === "grammar" && grammar.length === 0) { reject("grammar_absent"); return false; }

      const s = Number(q?.quality_score);
      if (Number.isFinite(s) && s < MIN_QUALITY_SCORE) { reject("low_quality"); return false; }
      return true;
    });

    if (validated.length === 0) {
      console.error("All questions rejected", rejected);
      return json({ error: "No question passed grounding/wording validation. Check the lesson content and try again.", rejected }, 422);
    }

    const deduped = dedupeQuestions(validated).map((q: any) => clampMcOptions(q));

    /* ------------------ Pick per source, honour distribution --------------- */

    const finalQuestions = pickBySource(deduped, distribution, poolTarget);
    finalQuestions.forEach(shuffleOptions);

    /* ------------------------------- Persist ------------------------------- */

    await admin.from("flashcard_unit_tests").delete().eq("unit_id", unit_id);

    const nowIso = new Date().toISOString();
    const rows = finalQuestions.map((q: any, i: number) => {
      const src: LessonSource = q.__source ?? "learn";
      const label = sourceLabel(src, Number(q.source_index ?? 0));
      return {
        unit_id,
        order_index: i + 1,
        question_type: isAllowedType(q.question_type) ? q.question_type : "multiple_choice",
        category: SOURCE_TO_CATEGORY[src],
        question: String(q.question ?? "").slice(0, 2000),
        passage: q.passage ?? null,
        options: q.options ?? null,
        correct_answer: q.correct_answer ?? "",
        explanation: q.explanation ?? null,
        teaching_explanation: q.teaching_explanation ?? null,
        image_url: q.image_url ?? null,
        difficulty: "easy",
        learning_objective: normalizeObjective(q.learning_objective),
        cognitive_level: normalizeCognitiveLevel(q.cognitive_level),
        estimated_time_seconds: normalizeEstimatedTime(q.estimated_time_seconds),
        quality_score: normalizeQualityScore(q.quality_score),
        skills_tested: toStrArr(q.skills_tested),
        // Admin-only traceability: the source label is always the first concept.
        lesson_concepts: [`Source: ${label}`, ...toStrArr(q.lesson_concepts)].slice(0, 20),
        vocabulary_used: toStrArr(q.vocabulary_used),
        grammar_concepts_used: toStrArr(q.grammar_concepts_used),
        ai_version: AI_VERSION,
        generated_at: nowIso,
        published: true,
      };
    });

    const { error: insErr } = await admin.from("flashcard_unit_tests").insert(rows);
    if (insErr) {
      console.error("Insert failed", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({
      inserted: rows.length,
      pool_target: poolTarget,
      distribution,
      rejected,
      sources: {
        listening_transcript: !!transcript,
        learn: learn.length,
        grammar: grammar.length,
        speaking: speaking.length,
      },
    });
  } catch (e: any) {
    console.error("generate-intermediate-test crashed", e);
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

/* ============================ helpers ============================ */

type Distribution = Record<LessonSource, number>;

const SOURCES: LessonSource[] = ["listening", "learn", "grammar", "speaking"];

/**
 * Pool size and split are derived entirely from how much content the lesson has.
 * Sources with no content get 0 and their share never exists in the first place.
 * A small lesson produces a small pool; a rich lesson approaches POOL_MAX.
 */
function buildDynamicDistribution(weights: Distribution): { poolTarget: number; distribution: Distribution } {
  const total = SOURCES.reduce((s, k) => s + Math.max(0, weights[k]), 0);
  const distribution: Distribution = { listening: 0, learn: 0, grammar: 0, speaking: 0 };
  if (total <= 0) return { poolTarget: 0, distribution };

  const poolTarget = Math.max(POOL_MIN, Math.min(POOL_MAX, Math.round(total)));

  for (const k of SOURCES) {
    if (weights[k] <= 0) continue;
    distribution[k] = Math.max(1, Math.round((weights[k] / total) * poolTarget));
  }

  // Correct rounding drift against poolTarget, only across available sources.
  const available = SOURCES.filter((k) => weights[k] > 0);
  let sum = available.reduce((s, k) => s + distribution[k], 0);
  let guard = 0;
  while (sum !== poolTarget && guard < 200) {
    // Give/take from the source with the largest weight share first.
    const ordered = available.slice().sort((a, b) => weights[b] - weights[a]);
    const key = sum < poolTarget ? ordered[0] : ordered[ordered.length - 1];
    if (sum < poolTarget) { distribution[key]++; sum++; }
    else if (distribution[key] > 1) { distribution[key]--; sum--; }
    else break;
    guard++;
  }

  return { poolTarget, distribution };
}

/** Fallback source when the AI omitted the tag. */
function inferSource(q: any): LessonSource {
  const t = String(q?.question_type ?? "");
  if (t === "grammar_selection") return "grammar";
  if (t === "conversation_completion") return "listening";
  return "learn";
}

/** Take up to the target per source, then fill remaining slots from anywhere. */
function pickBySource(pool: any[], dist: Distribution, poolTarget: number): any[] {
  const buckets: Record<LessonSource, any[]> = { listening: [], learn: [], grammar: [], speaking: [] };
  for (const q of pool) buckets[(q.__source as LessonSource) ?? "learn"].push(q);

  const chosen: any[] = [];
  const used = new Set<any>();
  for (const src of SOURCES) {
    if (dist[src] <= 0) continue;
    for (const q of shuffle(buckets[src]).slice(0, dist[src])) {
      chosen.push(q); used.add(q);
    }
  }
  if (chosen.length < poolTarget) {
    for (const q of shuffle(pool.filter((x) => !used.has(x)))) {
      if (chosen.length >= poolTarget) break;
      chosen.push(q); used.add(q);
    }
  }
  return shuffle(chosen).slice(0, poolTarget);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
