import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildVocabularyImagePrompt,
  buildGrammarImagePrompt,
  validateVocabularyConcept,
  validateGeneratedImage,
  validateGrammarImage,
  normalizeVocabulary,
} from "./rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generates a vocabulary image via the Lovable AI Gateway with STRICT rule
 * validation:
 *   1. Pre-generation: reject multi-concept / sentence-like inputs.
 *   2. Canonical reuse: if another card with the same normalized English
 *      translation already has an approved image, reuse it (no regeneration).
 *   3. Prompt: enforced one-concept, real-photo, no-text template.
 *   4. Post-generation: vision-model validation confirms no visible text,
 *      single subject, and photorealistic style. Failing images are rejected
 *      up to 2 retries before surfacing an error.
 *
 * See mem://features/learn-image-generation-rules.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: claims } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const userId = claims.claims.sub;
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { cardId, force } = body;
    if (!cardId) throw new Error("cardId required");

    const { data: card, error: cardErr } = await supabase.from("flashcards")
      .select("id, english_translation, kind").eq("id", cardId).single();
    if (cardErr || !card) throw new Error("card not found");

    const vocab = String(card.english_translation ?? "").trim();
    if (!vocab) throw new Error("english_translation is empty");

    const isGrammar = String(card.kind ?? "").toLowerCase() === "grammar";

    // --- Rule 1: pre-generation concept validation (vocabulary only) -------
    if (!isGrammar) {
      const conceptCheck = validateVocabularyConcept(vocab);
      if (!conceptCheck.valid && !force) {
        return json({
          error: "vocab_rule_violation",
          rule: "one-concept",
          reason: conceptCheck.reason,
          vocabulary: vocab,
        }, 422);
      }
    }

    // --- Rule 2: canonical reuse across the platform (same kind only) ------
    const normalized = normalizeVocabulary(vocab);
    const { data: existing } = await supabase.from("flashcards")
      .select("id, image_url, thumbnail_url, image_width, image_height, image_size_kb, image_alt, english_translation, kind")
      .neq("id", cardId)
      .not("image_url", "is", null)
      .ilike("english_translation", vocab)
      .limit(20);
    const canonical = (existing ?? []).find(
      (r: any) =>
        normalizeVocabulary(r.english_translation) === normalized &&
        r.image_url &&
        String(r.kind ?? "").toLowerCase() === (isGrammar ? "grammar" : String(r.kind ?? "").toLowerCase()) &&
        (isGrammar ? String(r.kind ?? "").toLowerCase() === "grammar" : String(r.kind ?? "").toLowerCase() !== "grammar")
    );
    if (canonical && !force) {
      return json({
        reused: true,
        canonicalCardId: canonical.id,
        image: {
          image_url: canonical.image_url,
          thumbnail_url: canonical.thumbnail_url,
          image_width: canonical.image_width,
          image_height: canonical.image_height,
          image_size_kb: canonical.image_size_kb,
          image_alt: canonical.image_alt,
        },
      });
    }

    // --- Rule 3 & 4: enforced prompt + post-generation validation ----------
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = isGrammar
      ? buildGrammarImagePrompt(vocab)
      : buildVocabularyImagePrompt(vocab);
    const MAX_ATTEMPTS = 3;
    let lastValidation: { valid: boolean; issues: string[] } | null = null;
    let b64: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-image-2", prompt, size: "1024x1024", quality: "low", n: 1 }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        throw new Error(`AI gateway: ${aiRes.status} ${t}`);
      }
      const aiJson = await aiRes.json();
      const candidate = aiJson?.data?.[0]?.b64_json;
      if (!candidate) throw new Error("No image returned");

      const validation = isGrammar
        ? await validateGrammarImage(candidate, vocab, apiKey)
        : await validateGeneratedImage(candidate, vocab, apiKey);
      lastValidation = validation;
      if (validation.valid) {
        b64 = candidate;
        break;
      }
      console.warn(`[image-rules] attempt ${attempt} failed for "${vocab}" (${isGrammar ? "grammar" : "vocab"}):`, validation.issues);
    }

    if (!b64) {
      return json({
        error: "image_rule_violation",
        rule: "post-generation-validation",
        issues: lastValidation?.issues ?? ["unknown"],
        vocabulary: vocab,
      }, 422);
    }

    return json({ pngBase64: b64, validated: true });
  } catch (e) {
    console.error("generate-flashcard-image error:", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
