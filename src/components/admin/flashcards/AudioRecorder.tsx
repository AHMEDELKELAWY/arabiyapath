import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Trash2, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  cardId: string;
  audioUrl: string | null | undefined;
  onChanged: (newUrl: string | null) => void;
}

type State = "idle" | "recording" | "preview" | "saving";

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export function AudioRecorder({ cardId, audioUrl, onChanged }: Props) {
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewBlobRef = useRef<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, [previewUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        previewBlobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
      };
      recorderRef.current = rec;
      rec.start();
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
      setState("recording");
    } catch (e: any) {
      toast({ title: "Microphone unavailable", description: e?.message || "Permission denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const discardPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    previewBlobRef.current = null;
    setState("idle");
  };

  const savePreview = async () => {
    const blob = previewBlobRef.current;
    if (!blob) return;
    setState("saving");
    try {
      const path = `flashcards/audio/${cardId}.webm`;
      const { error: upErr } = await supabase.storage
        .from("content")
        .upload(path, blob, { upsert: true, contentType: blob.type || "audio/webm" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("content").getPublicUrl(path);
      // Cache-bust so the new file shows up immediately.
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await (supabase as any)
        .from("flashcards").update({ audio_url: publicUrl }).eq("id", cardId);
      if (updErr) throw updErr;
      onChanged(publicUrl);
      toast({ title: "Audio saved" });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      previewBlobRef.current = null;
      setState("idle");
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
      setState("preview");
    }
  };

  const deleteAudio = async () => {
    if (!audioUrl) return;
    if (!confirm("Delete this card's recorded audio?")) return;
    try {
      // Best-effort remove storage object (path inferred from URL).
      try {
        const m = audioUrl.match(/\/content\/(.+?)(\?|$)/);
        if (m?.[1]) await supabase.storage.from("content").remove([decodeURIComponent(m[1])]);
      } catch { /* ignore */ }
      const { error } = await (supabase as any)
        .from("flashcards").update({ audio_url: null }).eq("id", cardId);
      if (error) throw error;
      onChanged(null);
      toast({ title: "Audio deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Recording {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
        </span>
        <Button size="sm" variant="destructive" onClick={stopRecording}>
          <Square className="w-3 h-3 mr-1" /> Stop
        </Button>
      </div>
    );
  }

  if (state === "preview" || state === "saving") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {previewUrl && (
          <audio controls src={previewUrl} preload="none" className="h-8 max-w-[220px]" />
        )}
        <Button size="sm" onClick={savePreview} disabled={state === "saving"}>
          {state === "saving" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={discardPreview} disabled={state === "saving"}>
          Discard
        </Button>
      </div>
    );
  }

  // idle
  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <audio controls src={audioUrl} preload="none" className="h-8 max-w-[220px]" />
        <Button size="sm" variant="outline" onClick={startRecording}>
          <RotateCcw className="w-3 h-3 mr-1" /> Re-record
        </Button>
        <Button size="sm" variant="outline" onClick={deleteAudio}>
          <Trash2 className="w-3 h-3 mr-1" /> Delete
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={startRecording}>
      <Mic className="w-3 h-3 mr-1" /> Record Audio
    </Button>
  );
}
