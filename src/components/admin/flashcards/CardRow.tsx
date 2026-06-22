import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Pencil, Trash2, Image as ImageIcon, Volume2, Loader2,
  Upload, X, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { FlashCardImage } from "@/components/flashcards/msa/FlashCardImage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  card: any;
  unitFolder: string;
  duplicate: boolean;
  highlighted: boolean;
  busy: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onBusyChange: (id: string | null) => void;
  onMutated: () => void;
  onEdit: (c: any) => void;
  onDelete: (id: string) => void;
  onGenImage: (c: any) => void;
  onGenAudio: (c: any, kind?: "main" | "example") => void;
}

function filenameFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split("/").pop() || "") || null;
  } catch {
    return url.split("/").pop() || null;
  }
}

export function CardRow({
  card: c, unitFolder, duplicate, highlighted, busy,
  selectable, selected, onToggleSelect,
  onBusyChange, onMutated, onEdit, onDelete, onGenImage, onGenAudio,
}: Props) {
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacing, setReplacing] = useState(false);
  const filename = filenameFromUrl(c.image_url);

  const togglePublished = async (v: boolean) => {
    const { error } = await (supabase as any)
      .from("flashcards").update({ published: v }).eq("id", c.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    onMutated();
  };

  const removeImage = async () => {
    if (!confirm("Remove this card's image?")) return;
    const { error } = await (supabase as any)
      .from("flashcards").update({ image_url: null }).eq("id", c.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Image removed" });
    onMutated();
  };

  const removeAudio = async () => {
    if (!confirm("Remove this card's audio?")) return;
    const { error } = await (supabase as any)
      .from("flashcards").update({ audio_url: null }).eq("id", c.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Audio removed" });
    onMutated();
  };

  const onReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!unitFolder) {
      return toast({ title: "This unit has no slug — set one before uploading images.", variant: "destructive" });
    }
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) {
      return toast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP.", variant: "destructive" });
    }
    setReplacing(true);
    try {
      const path = `flashcards/images/${unitFolder}/${f.name}`;
      const { error: upErr } = await supabase.storage
        .from("content")
        .upload(path, f, { upsert: true, contentType: f.type || undefined });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("content").getPublicUrl(path);
      const { error: updErr } = await (supabase as any)
        .from("flashcards").update({ image_url: urlData.publicUrl }).eq("id", c.id);
      if (updErr) throw updErr;
      toast({ title: "Image replaced" });
      onMutated();
    } catch (err: any) {
      toast({ title: "Replace failed", description: err.message, variant: "destructive" });
    } finally {
      setReplacing(false);
    }
  };

  return (
    <Card
      id={`card-${c.id}`}
      className={cn(
        "transition-shadow",
        highlighted && "ring-2 ring-primary shadow-lg",
      )}
    >
      <CardContent className="p-4 flex gap-4">
        {selectable && (
          <div className="flex items-start pt-1">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelect}
              aria-label="Select card"
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
        )}
        <div className="w-32 shrink-0 space-y-1">
          <FlashCardImage src={c.image_url} alt={c.image_alt || c.english_translation} />
          {filename && (
            <p className="text-[10px] font-mono text-muted-foreground break-all" title={filename}>
              {filename}
            </p>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">Card #{c.order_index}</Badge>
                {duplicate && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" /> Duplicate Card Number
                  </Badge>
                )}
              </div>
              <p className="text-xl mt-1" dir="rtl">{c.arabic_text}</p>
              <p className="text-sm text-muted-foreground">{c.english_translation}</p>
            </div>
            <label className="flex items-center gap-2 text-sm shrink-0">
              <Switch checked={!!c.published} onCheckedChange={togglePublished} />
              <span className={c.published ? "text-foreground" : "text-muted-foreground"}>
                {c.published ? "Published" : "Draft"}
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={c.image_url ? "secondary" : "outline"} className="gap-1">
              {c.image_url ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
              Image: {c.image_url ? "Available" : "Missing"}
            </Badge>
            <Badge variant={c.audio_url ? "secondary" : "outline"} className="gap-1">
              {c.audio_url ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
              Audio: {c.audio_url ? "Available" : "Missing"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => onGenImage(c)} disabled={busy}>
              {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />}
              Generate Image
            </Button>
            <Button size="sm" variant="outline" onClick={() => onGenAudio(c, "main")} disabled={busy}>
              <Volume2 className="w-3 h-3 mr-1" /> Generate Audio
            </Button>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onReplaceFile}
            />
            <Button size="sm" variant="outline" onClick={() => replaceInputRef.current?.click()} disabled={replacing}>
              {replacing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
              Replace Image
            </Button>
            {c.image_url && (
              <Button size="sm" variant="outline" onClick={removeImage}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove Image
              </Button>
            )}
            {c.audio_url && (
              <Button size="sm" variant="outline" onClick={removeAudio}>
                <Trash2 className="w-3 h-3 mr-1" /> Remove Audio
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onEdit(c)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(c.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
