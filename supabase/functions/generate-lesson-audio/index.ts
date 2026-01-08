import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Lesson {
  id: string;
  title: string;
  arabic_text: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) as any;

    const { lessonId, lessonIds, limit } = await req.json();

    // If single lesson ID provided
    if (lessonId) {
      const result = await generateAudioForLesson(supabase, lessonId, ELEVENLABS_API_KEY);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If multiple lesson IDs provided
    if (lessonIds && Array.isArray(lessonIds)) {
      const results = [];
      for (const id of lessonIds) {
        try {
          const result = await generateAudioForLesson(supabase, id, ELEVENLABS_API_KEY);
          results.push(result);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          results.push({ lessonId: id, success: false, error: message });
        }
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate for all lessons without audio (batch mode)
    const { data: lessons, error: fetchError } = await supabase
      .from("lessons")
      .select("id, title, arabic_text")
      .or("audio_url.is.null,audio_url.eq./audio/placeholder.mp3")
      .limit(limit || 10);

    if (fetchError) {
      throw new Error(`Failed to fetch lessons: ${fetchError.message}`);
    }

    console.log(`Found ${lessons?.length || 0} lessons to process`);

    const results = [];
    for (const lesson of lessons || []) {
      try {
        const result = await generateAudioForLesson(supabase, lesson.id, ELEVENLABS_API_KEY, lesson);
        results.push(result);
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Failed to generate audio for lesson ${lesson.id}:`, err);
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ lessonId: lesson.id, success: false, error: message });
      }
    }

    return new Response(JSON.stringify({ 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateAudioForLesson(
  supabase: any, 
  lessonId: string, 
  apiKey: string,
  lessonData?: Lesson
): Promise<{ lessonId: string; title: string; success: boolean; audioUrl?: string; error?: string }> {
  // Fetch lesson if not provided
  let lesson: Lesson;
  if (lessonData) {
    lesson = lessonData;
  } else {
    const { data, error } = await supabase
      .from("lessons")
      .select("id, title, arabic_text")
      .eq("id", lessonId)
      .single();
    
    if (error || !data) throw new Error(`Lesson not found: ${error?.message}`);
    lesson = data as Lesson;
  }

  if (!lesson.arabic_text) {
    throw new Error("Lesson has no Arabic text");
  }

  console.log(`Generating audio for: ${lesson.title}`);

  // Generate audio using ElevenLabs - using Arabic-optimized voice
  const voiceId = "pMsXgVXv3BLzUgSXRplE"; // Yaser - Arabic male voice
  
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: lesson.arabic_text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
          speed: 0.85, // Slower for language learning
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs error:", errorText);
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  console.log(`Audio generated: ${audioBuffer.byteLength} bytes`);

  // Upload to Supabase storage
  const fileName = `lessons/${lesson.id}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from("content")
    .upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("content")
    .getPublicUrl(fileName);

  const audioUrl = urlData.publicUrl;

  // Update lesson with audio URL
  const { error: updateError } = await supabase
    .from("lessons")
    .update({ audio_url: audioUrl })
    .eq("id", lesson.id);

  if (updateError) {
    throw new Error(`Update failed: ${updateError.message}`);
  }

  console.log(`Lesson ${lesson.id} updated with audio: ${audioUrl}`);

  return {
    lessonId: lesson.id,
    title: lesson.title,
    success: true,
    audioUrl,
  };
}
