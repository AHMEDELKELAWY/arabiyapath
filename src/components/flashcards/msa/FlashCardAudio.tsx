import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined;
  autoPlay?: boolean;
  label?: string;
  className?: string;
}

/**
 * Audio player for flash cards.
 * - Auto-plays ONCE on mount when autoPlay is true (no loop, no auto-repeat).
 * - Replay button lets users listen again manually.
 */
export function FlashCardAudio({ src, autoPlay = false, label = "Replay", className }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const playedOnceRef = useRef(false);

  useEffect(() => {
    playedOnceRef.current = false;
  }, [src]);

  useEffect(() => {
    if (!autoPlay || !src || playedOnceRef.current) return;
    const a = ref.current;
    if (!a) return;
    playedOnceRef.current = true;
    a.play().catch(() => {
      // Autoplay blocked — user can press replay.
    });
  }, [autoPlay, src]);

  const replay = () => {
    const a = ref.current;
    if (!a || !src) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <audio
        ref={ref}
        src={src ?? undefined}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={replay}
        disabled={!src}
        className="gap-2"
      >
        <Volume2 className={cn("h-4 w-4", playing && "animate-pulse text-primary")} />
        {label}
      </Button>
    </div>
  );
}
