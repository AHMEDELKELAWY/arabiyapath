import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image as ImageIcon, Link } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  bucket = "content",
  folder = "images",
  className,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
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
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [folder, bucket]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const removeImage = () => {
    onChange("");
  };

  if (value) {
    return (
      <div className={cn("relative group", className)}>
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file);
                };
                input.click();
              }}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => {
          if (!isUploading) {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileUpload(file);
            };
            input.click();
          }
        }}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop an image here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">Max 5MB</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="gap-2"
        >
          <Link className="h-4 w-4" />
          {showUrlInput ? "Hide URL Input" : "Use URL Instead"}
        </Button>
      </div>

      {showUrlInput && (
        <Input
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
