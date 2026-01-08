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

async function generateImageForLesson(
  supabase: any,
  lesson: Lesson,
  lovableApiKey: string
): Promise<{ success: boolean; lessonId: string; error?: string }> {
  try {
    console.log(`Generating image for lesson: ${lesson.id} - ${lesson.title}`);
    
    // Create a descriptive prompt for the image based on the lesson content
    const prompt = `Create a simple, clean educational illustration for an Arabic language lesson about: "${lesson.title}". The image should be culturally appropriate for Gulf/Middle Eastern context, warm and inviting colors, suitable for language learning. Style: flat design, modern, minimalist. The image should clearly represent the concept without any text.`;
    
    // Call Lovable AI Gateway with image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error for lesson ${lesson.id}:`, response.status, errorText);
      return { success: false, lessonId: lesson.id, error: `AI gateway error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`AI response received for lesson ${lesson.id}`);
    
    // Extract the base64 image from the response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error(`No image generated for lesson ${lesson.id}`);
      return { success: false, lessonId: lesson.id, error: "No image in response" };
    }

    // Extract base64 data (remove the data:image/png;base64, prefix)
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error(`Invalid image format for lesson ${lesson.id}`);
      return { success: false, lessonId: lesson.id, error: "Invalid image format" };
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const filename = `lesson-${lesson.id}-${Date.now()}.${imageFormat}`;
    const filePath = `lessons/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("lesson-images")
      .upload(filePath, bytes, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Storage upload error for lesson ${lesson.id}:`, uploadError);
      return { success: false, lessonId: lesson.id, error: `Upload error: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("lesson-images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log(`Image uploaded for lesson ${lesson.id}: ${publicUrl}`);

    // Update lesson with image URL
    const { error: updateError } = await supabase
      .from("lessons")
      .update({ image_url: publicUrl })
      .eq("id", lesson.id);

    if (updateError) {
      console.error(`Database update error for lesson ${lesson.id}:`, updateError);
      return { success: false, lessonId: lesson.id, error: `DB update error: ${updateError.message}` };
    }

    console.log(`Successfully generated and saved image for lesson ${lesson.id}`);
    return { success: true, lessonId: lesson.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error generating image for lesson ${lesson.id}:`, error);
    return { success: false, lessonId: lesson.id, error: errorMessage };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lessonId, lessonIds, limit = 5 } = await req.json().catch(() => ({}));

    // If specific lesson ID provided, generate for that lesson only
    if (lessonId) {
      const { data: lesson, error } = await supabase
        .from("lessons")
        .select("id, title, arabic_text")
        .eq("id", lessonId)
        .single();

      if (error || !lesson) {
        return new Response(
          JSON.stringify({ error: "Lesson not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await generateImageForLesson(supabase, lesson, lovableApiKey);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If array of lesson IDs provided
    if (lessonIds && Array.isArray(lessonIds)) {
      const { data: lessons, error } = await supabase
        .from("lessons")
        .select("id, title, arabic_text")
        .in("id", lessonIds);

      if (error || !lessons) {
        return new Response(
          JSON.stringify({ error: "Lessons not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const lesson of lessons) {
        const result = await generateImageForLesson(supabase, lesson, lovableApiKey);
        results.push(result);
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch process: find lessons without images
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id, title, arabic_text")
      .or("image_url.is.null,image_url.eq.")
      .limit(limit);

    if (error) {
      console.error("Error fetching lessons:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch lessons" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lessons || lessons.length === 0) {
      return new Response(
        JSON.stringify({ message: "No lessons without images found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${lessons.length} lessons without images`);

    const results = [];
    for (const lesson of lessons) {
      const result = await generateImageForLesson(supabase, lesson, lovableApiKey);
      results.push(result);
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Processed ${lessons.length} lessons: ${successful} successful, ${failed} failed`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
