import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as b64decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Build a WEBP "original" (max width 1024, quality 0.82) and a WEBP "thumbnail"
 * (width 300, quality 0.82) from the AI-generated PNG. Aspect ratio preserved.
 */
async function processImage(pngBytes: Uint8Array): Promise<{
  originalBytes: Uint8Array;
  originalWidth: number;
  originalHeight: number;
  originalSizeKb: number;
  thumbBytes: Uint8Array;
  thumbWidth: number;
  thumbHeight: number;
}> {
  const img = await Image.decode(pngBytes);
  const srcW = img.width;
  const srcH = img.height;

  // Original — cap width 1024, no upscale.
  const origScale = Math.min(1, 1024 / srcW);
  const origW = Math.max(1, Math.round(srcW * origScale));
  const origH = Math.max(1, Math.round(srcH * origScale));
  const orig = origScale < 1 ? img.clone().resize(origW, origH) : img.clone();
  const originalBytes = await orig.encode(undefined, { format: "webp", quality: 82 } as any)
    .catch(async () => await orig.encodeWEBP(82));

  // Thumbnail — width 300, aspect ratio preserved, no upscale.
  const thumbScale = Math.min(1, 300 / srcW);
  const thumbW = Math.max(1, Math.round(srcW * thumbScale));
  const thumbH = Math.max(1, Math.round(srcH * thumbScale));
  const thumb = img.clone().resize(thumbW, thumbH);
  const thumbBytes = await thumb.encode(undefined, { format: "webp", quality: 82 } as any)
    .catch(async () => await thumb.encodeWEBP(82));

  return {
    originalBytes,
    originalWidth: origW,
    originalHeight: origH,
    originalSizeKb: Math.round(originalBytes.byteLength / 1024),
    thumbBytes,
    thumbWidth: thumbW,
    thumbHeight: thumbH,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: claims } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { cardId } = await req.json();
    if (!cardId) throw new Error("cardId required");

    const { data: card, error: cardErr } = await supabase.from("flashcards")
      .select("id, english_translation, arabic_text, image_alt, order_index, unit_id").eq("id", cardId).single();
    if (cardErr || !card) throw new Error("card not found");

    const { data: unit, error: unitErr } = await supabase.from("flashcard_units")
      .select("slug").eq("id", card.unit_id).single();
    if (unitErr || !unit?.slug) throw new Error("unit slug not found");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Ultra-realistic, photorealistic real-life photograph of: ${card.english_translation}. Natural lighting, real-world setting, professional photography, no text, no captions, no logos, no watermarks, no illustrations, no cartoons.`;

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
    const b64 = aiJson?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    const bytes = b64decode(b64);

    // Decode + build thumbnail + dimensions BEFORE any DB write so any failure
    // short-circuits and we never store a partial image record.
    const processed = await processImage(bytes);

    // Use the same bucket + path layout as uploadAndWriteCardImage so every
    // path (Bulk Upload, Replace Image, Generate, Repair) writes to one place.
    const base = `ai-${cardId}`;
    const origPath = `flashcards/images/${unit.slug}/${base}.png`;
    const thumbPath = `flashcards/thumbnails/${unit.slug}/${base}.png`;
    const [{ error: upErr }, { error: thErr }] = await Promise.all([
      supabase.storage.from("content").upload(origPath, processed.originalBytes, { contentType: "image/png", upsert: true }),
      supabase.storage.from("content").upload(thumbPath, processed.thumbBytes, { contentType: "image/png", upsert: true }),
    ]);
    if (upErr) throw upErr;
    if (thErr) throw thErr;

    const image_url = supabase.storage.from("content").getPublicUrl(origPath).data.publicUrl;
    const thumbnail_url = supabase.storage.from("content").getPublicUrl(thumbPath).data.publicUrl;

    const { error: updErr } = await supabase.from("flashcards").update({
      image_url,
      thumbnail_url,
      image_width: processed.originalWidth,
      image_height: processed.originalHeight,
      image_size_kb: processed.originalSizeKb,
      image_alt: card.image_alt || card.english_translation,
    }).eq("id", cardId);
    if (updErr) throw updErr;

    // Re-fetch and verify — never silently succeed with a partial row.
    const { data: verify, error: vErr } = await supabase.from("flashcards")
      .select("image_url,thumbnail_url,image_width,image_height,image_size_kb")
      .eq("id", cardId).single();
    if (vErr) throw vErr;
    const missing: string[] = [];
    if (!verify?.image_url) missing.push("image_url");
    if (!verify?.thumbnail_url) missing.push("thumbnail_url");
    if (!verify?.image_width) missing.push("image_width");
    if (!verify?.image_height) missing.push("image_height");
    if (verify?.image_size_kb == null) missing.push("image_size_kb");
    if (missing.length) {
      throw new Error(`Verification failed — missing: ${missing.join(", ")}`);
    }

    return new Response(JSON.stringify({ success: true, url: image_url, thumbnail_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-flashcard-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
