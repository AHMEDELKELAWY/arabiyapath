// Generate an Intermediate-level Test using Lovable AI Gateway (Gemini 2.5 Pro).
//
// Reference inputs:
//   1. flashcard_units.lesson_topic  — primary topic reference
//   2. flashcard_units.video_url / video_storage_path — mentioned as context
//   3. flashcards where kind='learn'   — vocabulary
//   4. flashcards where kind='grammar' — grammar rules
//
// Output: rows in `flashcard_unit_tests`. Existing rows for the unit are wiped
// so the admin gets a clean set to review/edit/publish.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";

const BodySchema = z.object({ unit_id: z.string().uuid() });

const QUESTION_TYPES = [
  "listening",
  "vocabulary",
  "grammar",
  "sentence_ordering",
  "fill_blank",
  "reading_comprehension",
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

    // Verify caller is admin via JWT
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
      .eq("unit_id", unit_id).eq("kind", "learn").eq("published", true).limit(80);

    const { data: grammarCards } = await admin
      .from("flashcards")
      .select("arabic_text, english_translation, notes")
      .eq("unit_id", unit_id).eq("kind", "grammar").eq("published", true).limit(40);

    const vocabList = (learnCards ?? []).map((c: any) =>
      `- ${c.arabic_text}${c.transliteration ? ` (${c.transliteration})` : ""} = ${c.english_translation}`
    ).join("\n");
    const grammarList = (grammarCards ?? []).map((c: any) =>
      `- ${c.arabic_text} — ${c.english_translation}${c.notes ? `\n  Note: ${c.notes}` : ""}`
    ).join("\n");

    const prompt = `You are an Arabic language curriculum designer creating an INTERMEDIATE-level assessment.

## Unit
Title (EN): ${unit.title_en}
Title (AR): ${unit.title_ar ?? ""}

## Lesson Topic (primary reference)
${unit.lesson_topic ?? "(none provided)"}

## Listening resource
${unit.video_url ? `YouTube: ${unit.video_url}` : ""}${unit.video_storage_path ? `\nUploaded video: yes` : ""}
(You cannot watch the video; write listening questions inferred from the lesson topic that a listener of an intermediate Arabic clip on this topic would reasonably be tested on.)

## Learn vocabulary
${vocabList || "(none)"}

## Grammar
${grammarList || "(none)"}

## Task
Produce 10 diverse test questions covering these types: listening, vocabulary, grammar, sentence_ordering, fill_blank, reading_comprehension. Use MULTIPLE types (aim for at least 4 distinct types).

Rules:
- Arabic text must include full tashkeel (harakat).
- Difficulty is INTERMEDIATE — beyond simple word recognition; test understanding, inference, and application.
- Multiple-choice questions must have exactly 4 options and one correct answer text (matching one option exactly).
- sentence_ordering: "options" is the shuffled tokens array; "correct_answer" is the tokens in correct order (JSON array of strings).
- fill_blank: the question contains "____"; "options" is 4 candidate fills; "correct_answer" is the correct fill string.
- reading_comprehension: include a short "passage" field (2-4 Arabic sentences) plus a multiple-choice question about it.
- listening: frame the question as if the learner just watched the lesson video.
- Include a brief English "explanation" for every question.

Return STRICT JSON only, matching this shape (no prose, no markdown fences):
{
  "questions": [
    {
      "order_index": 1,
      "question_type": "vocabulary" | "listening" | "grammar" | "sentence_ordering" | "fill_blank" | "reading_comprehension",
      "question": "string",
      "passage": "string or null",
      "options": ["...", "..."] | null,
      "correct_answer": "string or array of strings",
      "explanation": "string"
    }
  ]
}`;

    // Call Lovable AI Gateway
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
      // Strip potential markdown fences and retry
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsedOutput = JSON.parse(cleaned);
    }
    const questions: any[] = parsedOutput?.questions ?? [];
    if (!Array.isArray(questions) || questions.length === 0) {
      return json({ error: "AI returned no questions", raw }, 502);
    }

    // Wipe existing generated set so admin has a clean list to review.
    await admin.from("flashcard_unit_tests").delete().eq("unit_id", unit_id);

    const rows = questions.map((q, i) => ({
      unit_id,
      order_index: q.order_index ?? i + 1,
      question_type: QUESTION_TYPES.includes(q.question_type) ? q.question_type : "vocabulary",
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
