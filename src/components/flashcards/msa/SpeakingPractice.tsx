import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCardImage } from "./FlashCardImage";
import { ActivityProgress } from "./ActivityProgress";
import { Mic, Square, Play, RotateCcw, ChevronLeft, ChevronRight, Loader2, Check, X, Headphones, GraduationCap, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { SPEAKING_KIND } from "./unitTemplate";


interface CardRow {
  id: string;
  arabic_text: string;
  english_translation: string;
  transliteration: string | null;
  image_url: string | null;
  image_alt: string | null;
  audio_url: string | null;
}

interface Props {
  unitId: string;
  onComplete?: () => void;
  nextLabel?: string;
  nextTarget?: "grammar" | "test";
}


// Normalize Arabic for comparison: strip tashkeel/punctuation/spaces.
function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[ٱإأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF]/g, "")
    .trim();
}

function similarity(a: string, b: string): number {
  const x = normalizeArabic(a);
  const y = normalizeArabic(b);
  if (!x || !y) return 0;
  const m = x.length, n = y.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = x[i - 1] === y[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const dist = dp[m][n];
  return Math.max(0, 1 - dist / Math.max(m, n));
}

export function SpeakingPractice({ unitId, onComplete, nextLabel, nextTarget = "test" }: Props) {
  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userBlobUrl, setUserBlobUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["fc-speaking-cards", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("id,arabic_text,english_translation,transliteration,image_url,image_alt,audio_url")
        .eq("unit_id", unitId)
        .eq("kind", SPEAKING_KIND)
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });

  const total = cards?.length ?? 0;
  const safeIdx = total > 0 ? Math.min(idx, total - 1) : 0;
  const current = cards?.[safeIdx];

  // Reset attempt + flip state when card changes.
  useEffect(() => {
    setUserBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setTranscript(null);
    setScore(null);
    setFlipped(false);
  }, [current?.id]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (userBlobUrl) URL.revokeObjectURL(userBlobUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playReference = () => {
    const a = refAudioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const startRecording = async () => {
    setTranscript(null);
    setScore(null);
    if (userBlobUrl) { URL.revokeObjectURL(userBlobUrl); setUserBlobUrl(null); }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast({ title: "Microphone access denied", description: "Allow mic access to record.", variant: "destructive" });
      return;
    }
    streamRef.current = stream;

    const mimeType = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      stream.getTracks().forEach((t) => t.stop());
      toast({ title: "Recording not supported in this browser", variant: "destructive" });
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      if (blob.size < 1024) {
        toast({ title: "Recording too short", description: "Please try again.", variant: "destructive" });
        return;
      }
      const url = URL.createObjectURL(blob);
      setUserBlobUrl(url);
      await scoreAttempt(blob);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    setRecording(false);
  };

  const scoreAttempt = async (blob: Blob) => {
    if (!current) return;
    setBusy(true);
    try {
      const ext = (blob.type.split(";")[0] === "audio/mp4") ? "mp4" : "webm";
      const file = new File([blob], `speech.${ext}`, { type: blob.type });
      const form = new FormData();
      form.append("file", file);

      const { data, error } = await supabase.functions.invoke("transcribe-speech", { body: form });
      if (error) throw error;
      const t = (data as any)?.transcript ?? "";
      setTranscript(t);
      setScore(similarity(t, current.arabic_text));
    } catch (err: any) {
      toast({ title: "Couldn't analyze recording", description: err?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const playUser = () => {
    const a = userAudioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const reset = () => {
    if (userBlobUrl) URL.revokeObjectURL(userBlobUrl);
    setUserBlobUrl(null);
    setTranscript(null);
    setScore(null);
  };

  if (isLoading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading cards…</CardContent></Card>;
  }
  if (!cards?.length) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">No cards in this unit yet.</CardContent></Card>;
  }
  if (!current) return null;

  if (completed) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-5 md:p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
            <Check className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold">Speaking Complete</h3>
          <p className="text-muted-foreground">Great work practicing your pronunciation.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-center pt-2">
            <Button variant="outline" onClick={() => { setCompleted(false); setIdx(0); }} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Practice Again
            </Button>
            <Button
              onClick={() => { setCompleted(false); setIdx(0); onComplete?.(); }}
              className="gap-2"
            >
              {nextTarget === "grammar" ? <ScrollText className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
              {nextLabel ?? "Continue to Test Yourself"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const scorePct = score !== null ? Math.round(score * 100) : null;
  const scoreColor =
    scorePct === null ? "" :
    scorePct >= 80 ? "text-green-600" :
    scorePct >= 50 ? "text-amber-600" :
    "text-destructive";

  const isFirst = safeIdx === 0;
  const isLast = safeIdx === total - 1;

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5 space-y-3 md:space-y-4">

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <ActivityProgress current={safeIdx + 1} total={total} label="Card" />
          </div>
          {flipped && (
            <Button variant="ghost" size="sm" onClick={() => setFlipped(false)} className="gap-1 shrink-0">
              <RotateCcw className="w-3.5 h-3.5" /> Flip back
            </Button>
          )}
        </div>

        {/* Flip card */}
        <div className="[perspective:1200px]">
          <div
            className={cn(
              "relative w-full transition-transform duration-500 [transform-style:preserve-3d]",
              flipped && "[transform:rotateY(180deg)]"
            )}
          >
            {/* FRONT — image only */}
            <div className="[backface-visibility:hidden]">
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="block w-full text-left group focus:outline-none focus:ring-2 focus:ring-primary rounded-2xl"
                aria-label="Reveal sentence"
              >
                <FlashCardImage
                  src={current.image_url}
                  alt={current.image_alt || "Flash card image"}
                  capped
                  className="group-hover:opacity-95 transition-opacity"
                />
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Tap the image to reveal the sentence
                </p>
              </button>
            </div>

            {/* BACK — content */}
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-y-auto">
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-2xl md:text-4xl font-bold leading-snug md:leading-loose break-words" dir="rtl" lang="ar">
                    {current.arabic_text}
                  </p>
                  {current.transliteration && (
                    <p className="text-sm md:text-base text-muted-foreground italic">{current.transliteration}</p>
                  )}
                  <p className="text-sm md:text-base">{current.english_translation}</p>
                </div>


                <audio ref={refAudioRef} src={current.audio_url ?? undefined} preload="none" />
                <div className="flex justify-center">
                  <Button variant="outline" onClick={playReference} disabled={!current.audio_url} className="gap-2 min-h-[44px]">
                    <Play className="w-4 h-4" /> Listen to native
                  </Button>
                </div>

                <div className="flex justify-center gap-2">
                  {!recording ? (
                    <Button onClick={startRecording} disabled={busy} className="gap-2 min-h-[44px]" size="lg">
                      <Mic className="w-4 h-4" /> {userBlobUrl ? "Record again" : "Record yourself"}
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="gap-2 min-h-[44px]" size="lg">
                      <Square className="w-4 h-4" /> Stop
                    </Button>
                  )}
                </div>

                {recording && (
                  <p className="text-center text-xs text-muted-foreground animate-pulse">
                    Recording… speak the Arabic above clearly.
                  </p>
                )}

                {userBlobUrl && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <p className="text-sm font-medium text-center">Compare</p>
                    <audio ref={userAudioRef} src={userBlobUrl} preload="none" />
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button size="sm" variant="outline" onClick={playReference} disabled={!current.audio_url} className="gap-2">
                        <Play className="w-4 h-4" /> Native
                      </Button>
                      <Button size="sm" variant="outline" onClick={playUser} className="gap-2">
                        <Play className="w-4 h-4" /> Your recording
                      </Button>
                      <Button size="sm" variant="ghost" onClick={reset} className="gap-2">
                        <RotateCcw className="w-4 h-4" /> Reset
                      </Button>
                    </div>

                    {busy && (
                      <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your pronunciation…
                      </p>
                    )}

                    {!busy && transcript !== null && (
                      <div className="space-y-2 text-center">
                        <p className="text-xs text-muted-foreground">We heard:</p>
                        <p className="text-lg" dir="rtl" lang="ar">{transcript || "—"}</p>
                        {scorePct !== null && (
                          <p className={cn("text-2xl font-bold flex items-center justify-center gap-2", scoreColor)}>
                            {scorePct >= 80 ? <Check className="w-6 h-6" /> : scorePct < 50 ? <X className="w-6 h-6" /> : null}
                            {scorePct}% match
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation — same row on all sizes */}
        <div
          className="flex flex-row justify-between gap-2 pt-2"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={recording}
            className={cn("gap-1 flex-1 min-h-[44px]", isFirst && "invisible")}
            aria-hidden={isFirst}
            tabIndex={isFirst ? -1 : 0}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <Button
            onClick={() => {
              if (isLast) setCompleted(true);
              else setIdx((i) => Math.min(total - 1, i + 1));
            }}
            disabled={recording}
            className="gap-1 flex-1 min-h-[44px]"
          >
            {isLast ? "Finish" : "Next"} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

