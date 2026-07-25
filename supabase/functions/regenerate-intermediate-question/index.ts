// Regenerate / transform a single Intermediate-test question in place.
//
// Modes:
//   regenerate           — new question of the same type
//   easier               — same type, lower difficulty
//   harder               — same type, slightly firmer (still plain/easy style)
//   improve_distractors  — keep question + correct answer, rewrite distractors
//   rewrite              — same type, rephrase the question in a fresh way
//   change_type          — convert to a different supported type (target_type)
//
// Preserves the row id and order_index. Does not touch other questions.
// Uses the SAME lesson sources, wording rules and grounding validation as
// full pool generation (../_shared/assessment-rules.ts, v7-source-grounded).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import {
  AI_VERSION,
  ALLOWED_TYPES,
  SOURCE_CONTRACT_PROMPT,
  TYPE_RULES_PROMPT,
  WORDING_RULES_PROMPT,
  buildLessonHaystack,
  checkWording,
  clampMcOptions,
  isAllowedType,
  isGrounded,
  isListeningGrounded,
  normalizeCognitiveLevel,
  normalizeEstimatedTime,
  normalizeObjective,
  normalizeQualityScore,
  normalizeSource,
  shuffleOptions,
  sourceLabel,
  toStrArr,
  type LessonSource,
} from "../_shared/assessment-rules.ts";

const MODES = ["regenerate","easier","harder","improve_distractors","rewrite","change_type"] as const;

const BodySchema = z.object({
  question_id: z.string().uuid(),
  mode: z.enum(MODES).optional().default("regenerate"),
  target_type: z.enum(ALLOWED_TYPES).optional(),
});

const MAX_ATTEMPTS = 2;
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
      .from("flashcard_unit_tests").select("*").eq("id", question_id).single();
    if (qErr || !existing) return json({ error: "question not found" }, 404);

    const finalType = mode === "change_type" && target_type ? target_type : existing.question_type;

    /* ------------------------- Gather lesson sources ------------------------ */

    const { data: unit } = await admin
      .from("flashcard_units")
      .select("id, title_en, title_ar, lesson_topic, listening_transcript")
      .eq("id", existing.unit_id).single();

    const [{ data: learnCards }, { data: grammarCards }, { data: speakingCards }, { data: siblings }] =
      await Promise.all([
        admin.from("flashcards")
          .select("arabic_text, transliteration, english_translation, notes, image_url")
          .eq("unit_id", existing.unit_id).eq("kind", "learn").eq("published", true).limit(80),
        admin.from("flashcards")
          .select("arabic_text, english_translation, notes")
          .eq("unit_id", existing.unit_id).eq("kind", "grammar").eq("published", true).limit(40),
        admin.from("flashcards")
          .select("arabic_text, transliteration, english_translation, notes")
          .eq("unit_id", existing.unit_id).eq("kind", "speaking").eq("published", true).limit(40),
        admin.from("flashcard_unit_tests")
          .select("question").eq("unit_id", existing.unit_id).neq("id", question_id).limit(30),
      ]);

    const learn = learnCards ?? [];
    const grammar = grammarCards ?? [];
    const speaking = speakingCards ?? [];
    const transcript = (unit?.listening_transcript ?? "").trim() || null;

    const transcriptText = transcript
      ? transcript.split(/\n+/).map((l: string, i: number) => `[L${i + 1}] ${l.trim()}`).filter(Boolean).join("\n")
      : "(no transcript — do NOT produce a listening question)";
    const vocabList = learn.map((c: any, i: number) =>
      `[Learn #${i + 1}] ${c.arabic_text}${c.transliteration ? ` (${c.transliteration})` : ""} = ${c.english_translation}${c.notes ? ` — ${c.notes}` : ""}${c.image_url ? " [image]" : ""}`
    ).join("\n");
    const grammarList = grammar.map((c: any, i: number) =>
      `[Grammar #${i + 1}] ${c.arabic_text} — ${c.english_translation}${c.notes ? `\n  Note: ${c.notes}` : ""}`
    ).join("\n");
    const speakingList = speaking.map((c: any, i: number) =>
      `[Speaking #${i + 1}] ${c.arabic_text} — ${c.english_translation}`
    ).join("\n");
    const imageList = learn.filter((c: any) => c.image_url).slice(0, 8)
      .map((c: any) => `- "${c.english_translation}" → ${c.image_url}`).join("\n");
    const sibList = (siblings ?? []).map((r: any, i: number) => `${i + 1}. ${r.question}`).join("\n");

    /* ---------------------------- Mode instruction ------------------------- */

    const modeInstruction = (() => {
      switch (mode) {
        case "easier":
          return `Rewrite as an EASIER version of the same question. Keep the same question_type. Use the most obvious taught item and clearly wrong distractors. Pure recognition is fine.`;
        case "harder":
          return `Rewrite as a slightly firmer version of the same question. Keep the same question_type. Stay in the plain teacher-check style — no inference, no trick wording, no near-identical distractors. "Firmer" only means the answer is not obvious at a glance.`;
        case "improve_distractors":
          return `KEEP the original question text and correct_answer EXACTLY the same. ONLY replace the distractors with plausible ones drawn from the SAME lesson. correct_answer must remain in the options array.
Original question: ${JSON.stringify(existing.question)}
Original correct_answer: ${JSON.stringify(existing.correct_answer)}`;
        case "rewrite":
          return `Rewrite the question in a fresh way (new wording, new example, new distractors) but keep the SAME question_type and the SAME taught item being checked.`;
        case "change_type":
          return `Convert the question to type "${finalType}". Check the same taught item, adapted to that type's formatting rules.`;
        case "regenerate":
        default:
          return `Produce a NEW question of type "${finalType}" checking the same taught item (or a closely related one from the same lesson). Vary wording and distractors — do not repeat the previous version.`;
      }
    })();

    const buildPrompt = (feedback?: string) => `You are a teacher asking a student ONE short question about the lesson they just finished.
You are not writing new educational content — you only turn the lesson material below into a question.

${SOURCE_CONTRACT_PROMPT}

============================================================
## LESSON MATERIALS
============================================================

## Unit (context only — never a question source)
Title (EN): ${unit?.title_en ?? ""}
Title (AR): ${unit?.title_ar ?? ""}
Lesson topic: ${unit?.lesson_topic ?? "(none)"}

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

${WORDING_RULES_PROMPT}

${TYPE_RULES_PROMPT}

## Teaching explanation
"teaching_explanation" (1–2 short English sentences) points to the specific lesson item and plainly says why the correct answer is right.
${feedback ? `\n## YOUR PREVIOUS ATTEMPT WAS REJECTED\nReason: ${feedback}\nFix it and return a valid question.\n` : ""}
Return STRICT JSON only:
{
  "source": "listening" | "learn" | "grammar" | "speaking",
  "source_index": 0,
  "question_type": "${finalType}",
  "question": "string (ONE short sentence)",
  "passage": "string or null",
  "options": [...],
  "correct_answer": "string" | {"left":"right", ...},
  "explanation": "string",
  "teaching_explanation": "string",
  "image_url": "string or null",
  "difficulty": "easy",
  "learning_objective": "<one of: vocabulary_recognition | vocabulary_usage | grammar_recognition | grammar_usage | listening_comprehension | reading_comprehension | sentence_construction | word_order | image_interpretation | context_understanding | everyday_communication>",
  "cognitive_level": 1,
  "estimated_time_seconds": 15-60,
  "quality_score": 0-100,
  "skills_tested": ["..."],
  "lesson_concepts": ["<exact string(s) from the materials above>"],
  "vocabulary_used": ["<exact Arabic word(s) from the materials above>"],
  "grammar_concepts_used": ["<exact string(s) from the Grammar cards above>"]
}`;

    /* ------------------- Generate + validate (same gates) ------------------ */

    const haystack = buildLessonHaystack({ transcript, learn, grammar, speaking });
    let q: any = null;
    let rejection = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You regenerate ONE short teacher-style question for an Arabic lesson review. Only ask about content that appears in the lesson materials the user provides (listening transcript, learn cards, grammar cards, speaking cards). Never invent facts, never test general knowledge, never use instructional wording like 'complete the dialogue' or 'listen then choose'. Output valid JSON only.",
            },
            { role: "user", content: buildPrompt(rejection || undefined) },
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
      let candidate: any;
      try { candidate = JSON.parse(raw); }
      catch { candidate = JSON.parse(raw.replace(/```json|```/g, "").trim()); }

      const check = validate(candidate, { transcript, haystack, speaking, grammar });
      if (check.ok) { q = candidate; break; }
      rejection = check.reason!;
      console.warn(`regenerate attempt ${attempt} rejected: ${rejection}`);
    }

    if (!q) {
      return json({ error: `Regenerated question failed validation: ${rejection}`, reason: rejection }, 422);
    }

    /* ------------------------------- Persist ------------------------------- */

    const src: LessonSource = normalizeSource(q.source) ?? "learn";
    const clamped = shuffleOptions(clampMcOptions(q));

    const patch: Record<string, unknown> = {
      question_type: isAllowedType(clamped.question_type) ? clamped.question_type : finalType,
      question: String(clamped.question ?? "").slice(0, 2000),
      passage: clamped.passage ?? null,
      options: clamped.options ?? null,
      correct_answer: clamped.correct_answer ?? "",
      explanation: clamped.explanation ?? null,
      teaching_explanation: clamped.teaching_explanation ?? null,
      image_url: clamped.image_url ?? existing.image_url ?? null,
      difficulty: "easy",
      learning_objective: normalizeObjective(clamped.learning_objective),
      cognitive_level: normalizeCognitiveLevel(clamped.cognitive_level),
      estimated_time_seconds: normalizeEstimatedTime(clamped.estimated_time_seconds),
      quality_score: normalizeQualityScore(clamped.quality_score),
      skills_tested: toStrArr(clamped.skills_tested),
      // Admin-only traceability: the source label is always the first concept.
      lesson_concepts: [
        `Source: ${sourceLabel(src, Number(clamped.source_index ?? 0))}`,
        ...toStrArr(clamped.lesson_concepts),
      ].slice(0, 20),
      vocabulary_used: toStrArr(clamped.vocabulary_used),
      grammar_concepts_used: toStrArr(clamped.grammar_concepts_used),
      ai_version: AI_VERSION,
      generated_at: new Date().toISOString(),
    };

    const { error: upErr } = await admin
      .from("flashcard_unit_tests").update(patch).eq("id", question_id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, mode, source: src });
  } catch (e: any) {
    console.error("regenerate-intermediate-question crashed", e);
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

/** Exactly the gates used by full pool generation. */
function validate(
  q: any,
  ctx: { transcript: string | null; haystack: string; speaking: any[]; grammar: any[] },
): { ok: boolean; reason?: string } {
  if (!q || typeof q !== "object") return { ok: false, reason: "invalid JSON shape" };
  if (!isAllowedType(q.question_type)) return { ok: false, reason: `forbidden question type "${q.question_type}"` };

  const wording = checkWording(q.question, q.question_type);
  if (!wording.ok) return { ok: false, reason: `wording — ${wording.reason}` };

  const src = normalizeSource(q.source) ?? "learn";
  if (src === "listening") {
    if (!ctx.transcript) return { ok: false, reason: "listening question but the lesson has no transcript" };
    if (!isListeningGrounded(q, ctx.transcript)) {
      return { ok: false, reason: "listening question not traceable to the transcript" };
    }
    return { ok: true };
  }
  if (src === "speaking" && ctx.speaking.length === 0) return { ok: false, reason: "no speaking cards in this lesson" };
  if (src === "grammar" && ctx.grammar.length === 0) return { ok: false, reason: "no grammar cards in this lesson" };
  if (!isGrounded(q, ctx.haystack)) return { ok: false, reason: "answer not traceable to the lesson materials" };
  return { ok: true };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
