import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Volume2, Mic, Link } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AudioUploaderProps {
  value: string;
  onChange: (url: string) => void;
  arabicText?: string;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function AudioUploader({
  value,
  onChange,
  arabicText,
  bucket = "content",
  folder = "audio",
  className,
}: AudioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success("Audio uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload audio");
    } finally {
      setIsUploading(false);
    }
  };

  const generateAudio = async () => {
    if (!arabicText?.trim()) {
      toast.error("No Arabic text provided for audio generation");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: arabicText }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate audio");
      }

      const audioBlob = await response.blob();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, audioBlob, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success("Audio generated successfully!");
    } catch (error) {
      console.error("Audio generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate audio");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file);
    };
    input.click();
  };

  const removeAudio = () => {
    onChange("");
  };

  const isLoading = isUploading || isGenerating;

  return (
    <div className={cn("space-y-3", className)}>
      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50">
          <Volume2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <audio controls className="flex-1 h-10">
            <source src={value} type="audio/mpeg" />
          </audio>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={removeAudio}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFileSelect}
            disabled={isLoading}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Audio
          </Button>

          {arabicText && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={generateAudio}
              disabled={isLoading || !arabicText.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="gap-2"
          >
            <Link className="h-4 w-4" />
            URL
          </Button>
        </div>
      )}

      {showUrlInput && !value && (
        <Input
          placeholder="https://example.com/audio.mp3"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
