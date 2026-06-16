import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as b64decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    // Admin check
    const userId = claims.claims.sub;
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { cardId } = await req.json();
    if (!cardId) throw new Error("cardId required");

    const { data: card, error: cardErr } = await supabase.from("flashcards").select("id, english_translation, arabic_text, image_alt").eq("id", cardId).single();
    if (cardErr || !card) throw new Error("card not found");

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

    const path = `flashcards/${cardId}.png`;
    const { error: upErr } = await supabase.storage.from("lesson-images").upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("lesson-images").getPublicUrl(path);

    await supabase.from("flashcards").update({ image_url: pub.publicUrl, image_alt: card.image_alt || card.english_translation }).eq("id", cardId);

    return new Response(JSON.stringify({ success: true, url: pub.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-flashcard-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
