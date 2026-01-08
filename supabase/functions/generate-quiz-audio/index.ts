import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionIds } = await req.json();
    
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      throw new Error("Question IDs array is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");

    if (!elevenLabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch questions
    const { data: questions, error: fetchError } = await supabase
      .from("quiz_questions")
      .select("id, prompt")
      .in("id", questionIds);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error("Failed to fetch questions");
    }

    const results: { id: string; success: boolean; audioUrl?: string; error?: string }[] = [];

    for (const question of questions || []) {
      try {
        // Extract Arabic text from the prompt (text between quotes or Arabic characters)
        const arabicMatch = question.prompt.match(/[""]([^""]+)[""]|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g);
        
        if (!arabicMatch || arabicMatch.length === 0) {
          results.push({ id: question.id, success: false, error: "No Arabic text found" });
          continue;
        }

        // Get the Arabic text (remove quotes if present)
        let arabicText = arabicMatch[0].replace(/[""]/g, "").trim();
        
        console.log(`Generating audio for question ${question.id}: "${arabicText}"`);

        // Generate audio with ElevenLabs
        const voiceId = "onwK4e9ZLuTAKqWW03F9"; // Daniel - good for Arabic
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: arabicText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.6,
                similarity_boost: 0.75,
                style: 0.3,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`ElevenLabs error for ${question.id}:`, errorText);
          results.push({ id: question.id, success: false, error: "TTS generation failed" });
          continue;
        }

        const audioBuffer = await response.arrayBuffer();
        const audioData = new Uint8Array(audioBuffer);

        // Upload to storage
        const fileName = `quiz-audio/${question.id}.mp3`;
        const { error: uploadError } = await supabase.storage
          .from("content")
          .upload(fileName, audioData, {
            contentType: "audio/mpeg",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${question.id}:`, uploadError);
          results.push({ id: question.id, success: false, error: "Upload failed" });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("content")
          .getPublicUrl(fileName);

        // Update question with audio URL
        const { error: updateError } = await supabase
          .from("quiz_questions")
          .update({ audio_url: urlData.publicUrl })
          .eq("id", question.id);

        if (updateError) {
          console.error(`Update error for ${question.id}:`, updateError);
          results.push({ id: question.id, success: false, error: "DB update failed" });
          continue;
        }

        results.push({ id: question.id, success: true, audioUrl: urlData.publicUrl });
        console.log(`Successfully generated audio for question ${question.id}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (err) {
        console.error(`Error processing question ${question.id}:`, err);
        results.push({ id: question.id, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${results.length} questions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        successful: successCount,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate quiz audio error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
