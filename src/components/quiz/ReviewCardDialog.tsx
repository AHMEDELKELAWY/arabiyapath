import { useEffect, useRef, useState } from "react";
import { Volume2, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizReviewCard } from "@/hooks/useLearning";

interface Props {
  card: QuizReviewCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal that shows the original learning card (image, arabic text,
 * transliteration, audio) for a missed quiz question. Reuses the same
 * <audio> element pattern as the lesson player so playback matches.
 */
export function ReviewCardDialog({ card, open, onOpenChange }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, [open]);

  const play = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">{card.title || "Original card"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {card.image_url && (
            <div className="overflow-hidden rounded-xl bg-muted">
              <img
                src={card.image_url}
                alt={card.title || card.arabic_text || "Learning card"}
                className="block w-full h-auto max-h-[280px] object-contain mx-auto"
                loading="lazy"
              />
            </div>
          )}

          {card.arabic_text && (
            <div className="text-center space-y-1">
              <div
                dir="rtl"
                lang="ar"
                className="text-3xl font-semibold text-foreground leading-snug"
              >
                {card.arabic_text}
              </div>
              {card.transliteration && (
                <div className="text-sm text-muted-foreground italic">
                  {card.transliteration}
                </div>
              )}
            </div>
          )}

          {card.audio_url && (
            <div className="flex justify-center">
              <audio
                ref={audioRef}
                src={card.audio_url}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              <Button variant="outline" size="sm" onClick={play} className="gap-2">
                <Volume2 className={cn("h-4 w-4", playing && "animate-pulse text-primary")} />
                Play audio
              </Button>
            </div>
          )}

          {!card.image_url && !card.audio_url && !card.arabic_text && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-6">
              <ImageIcon className="h-4 w-4" />
              Original card content not available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
