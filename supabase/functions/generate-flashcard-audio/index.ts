import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel — works well for Arabic

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: claims } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { cardId, kind = "main" } = await req.json();
    if (!cardId) throw new Error("cardId required");

    const { data: card, error: cardErr } = await supabase.from("flashcards").select("id, arabic_text, example_arabic").eq("id", cardId).single();
    if (cardErr || !card) throw new Error("card not found");
    const text = kind === "example" ? card.example_arabic : card.arabic_text;
    if (!text) throw new Error("No text to synthesize");

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: 0.95 },
      }),
    });
    if (!ttsRes.ok) {
      const t = await ttsRes.text();
      throw new Error(`ElevenLabs: ${ttsRes.status} ${t}`);
    }
    const buf = new Uint8Array(await ttsRes.arrayBuffer());
    const path = `flashcards/audio/${cardId}-${kind}.mp3`;
    const { error: upErr } = await supabase.storage.from("content").upload(path, buf, { contentType: "audio/mpeg", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("content").getPublicUrl(path);

    const field = kind === "example" ? "audio_example_url" : "audio_url";
    await supabase.from("flashcards").update({ [field]: pub.publicUrl }).eq("id", cardId);

    return new Response(JSON.stringify({ success: true, url: pub.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-flashcard-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
