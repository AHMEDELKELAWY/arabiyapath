// Regenerate a single Intermediate-test question in place.
// Preserves the row's id, order_index, and difficulty; overwrites the content
// with a freshly generated question of the same type.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";

const BodySchema = z.object({ question_id: z.string().uuid() });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { question_id } = parsed.data;

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

    const { data: unit } = await admin
      .from("flashcard_units")
      .select("id, title_en, title_ar, lesson_topic")
      .eq("id", existing.unit_id).single();

    const { data: learnCards } = await admin
      .from("flashcards")
      .select("arabic_text, transliteration, english_translation, notes")
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
      `- ${c.arabic_text}${c.transliteration ? ` (${c.transliteration})` : ""} = ${c.english_translation}${c.notes ? ` — ${c.notes}` : ""}`
    ).join("\n");
    const grammarList = (grammarCards ?? []).map((c: any) =>
      `- ${c.arabic_text} — ${c.english_translation}${c.notes ? `\n  Note: ${c.notes}` : ""}`
    ).join("\n");
    const sibList = (siblings ?? [])
      .map((r: any, i: number) => `${i + 1}. ${r.question}`).join("\n");

    const prompt = `You are a senior Arabic curriculum designer. Regenerate ONE INTERMEDIATE (CEFR B1) question of a specific type. The question is part of an existing test — do NOT repeat any of the other questions.

## Unit
Title (EN): ${unit?.title_en ?? ""}
Title (AR): ${unit?.title_ar ?? ""}
Lesson topic: ${unit?.lesson_topic ?? "(none)"}

## Learn vocabulary
${vocabList || "(none)"}

## Grammar
${grammarList || "(none)"}

${sibList ? `## Other questions already in this test (DO NOT REPEAT)
${sibList}
` : ""}
## Requirement
Produce EXACTLY ONE question of type "${existing.question_type}". Follow the same formatting rules used for the full test generator (fully vowelized Arabic, plausible distractors, brief English explanation). Return STRICT JSON only:

{
  "question_type": "${existing.question_type}",
  "question": "string",
  "passage": "string or null",
  "options": ["...","..."] | [{"left":"...","right":"..."}, ...],
  "correct_answer": "string" | ["...","..."] | {"left":"right", ...},
  "explanation": "string"
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
    try { q = JSON.parse(raw); } catch { q = JSON.parse(raw.replace(/```json|```/g, "").trim()); }

    const { error: upErr } = await admin
      .from("flashcard_unit_tests")
      .update({
        question_type: q.question_type ?? existing.question_type,
        question: String(q.question ?? "").slice(0, 2000),
        passage: q.passage ?? null,
        options: q.options ?? null,
        correct_answer: q.correct_answer ?? "",
        explanation: q.explanation ?? null,
      })
      .eq("id", question_id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true });
  } catch (e: any) {
    console.error("regenerate-intermediate-question crashed", e);
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
