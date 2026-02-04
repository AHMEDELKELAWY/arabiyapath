import { useState, useRef } from "react";
import { Volume2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FlashCard as FlashCardType } from "@/data/flashCardsData";
import { supabase } from "@/integrations/supabase/client";

interface FlashCardProps {
  card: FlashCardType;
  onMastered?: () => void;
  isReviewed?: boolean;
}

export function FlashCard({ card, onMastered, isReviewed }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMasteredAnimation, setShowMasteredAnimation] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    // Haptic feedback on mobile if supported
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const playAudio = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;

    setIsPlaying(true);
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
          body: JSON.stringify({ 
            text,
            voiceId: "onwK4e9ZLuTAKqWW03F9" // Daniel - good for Arabic
          }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  const handleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMasteredAnimation(true);
    setTimeout(() => {
      setShowMasteredAnimation(false);
      onMastered?.();
    }, 600);
  };

  return (
    <div className="perspective-1000 w-full max-w-lg mx-auto">
      {/* Mastered animation overlay */}
      {showMasteredAnimation && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="animate-scale-in">
            <Sparkles className="w-16 h-16 text-primary animate-pulse" />
          </div>
        </div>
      )}

      <div
        onClick={handleFlip}
        className={cn(
          "relative w-full min-h-[400px] cursor-pointer transition-transform duration-500 transform-style-3d",
          isFlipped && "rotate-y-180"
        )}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front of card */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rounded-2xl p-6 md:p-8",
            "bg-gradient-to-br from-card via-card to-accent/20",
            "border border-border/50 shadow-xl",
            "hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300",
            isReviewed && "ring-2 ring-primary/30"
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col h-full">
            {/* Category badge */}
            <div className="flex justify-between items-start mb-6">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {card.category}
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground">
                Level {card.level}
              </span>
            </div>

            {/* Arabic phrase - main focus */}
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-relaxed" dir="rtl">
                {card.arabicPhrase}
              </h2>
              <p className="text-lg text-muted-foreground italic">
                {card.transliteration}
              </p>
            </div>

            {/* Audio button */}
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => playAudio(card.arabicPhrase, e)}
                disabled={isPlaying}
                className="gap-2"
              >
                <Volume2 className={cn("w-4 h-4", isPlaying && "animate-pulse text-primary")} />
                {isPlaying ? "Playing..." : "Listen"}
              </Button>
            </div>

            {/* Tap to flip hint */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Tap to reveal meaning
            </p>
          </div>
        </div>

        {/* Back of card */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rounded-2xl p-6 md:p-8",
            "bg-gradient-to-br from-primary/5 via-card to-accent/30",
            "border border-primary/20 shadow-xl overflow-y-auto"
          )}
          style={{ 
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold text-primary">
                {card.englishMeaning}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                className="shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Usage context */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">When to use:</h4>
              <p className="text-sm text-muted-foreground">{card.usageContext}</p>
            </div>

            {/* Cultural insight */}
            <div className="space-y-1 p-3 rounded-lg bg-accent/50">
              <h4 className="text-sm font-semibold text-foreground">💡 Cultural Insight:</h4>
              <p className="text-sm text-muted-foreground">{card.culturalInsight}</p>
            </div>

            {/* Example */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Example:</h4>
              <p className="text-sm text-foreground" dir="rtl">{card.exampleArabic}</p>
              <p className="text-sm text-muted-foreground italic">{card.exampleEnglish}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => playAudio(card.exampleArabic, e)}
                disabled={isPlaying}
                className="gap-2 mt-2"
              >
                <Volume2 className={cn("w-4 h-4", isPlaying && "animate-pulse text-primary")} />
                Listen to example
              </Button>
            </div>

            {/* Level 3 tone variations */}
            {card.level === 3 && card.formalTone && (
              <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <h4 className="text-sm font-semibold text-primary">🎭 Tone Variations:</h4>
                <div className="space-y-1">
                  <p className="text-xs">
                    <span className="font-medium">Formal:</span>{" "}
                    <span className="text-muted-foreground">{card.formalTone}</span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">Social:</span>{" "}
                    <span className="text-muted-foreground">{card.socialTone}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Mark as mastered */}
            <div className="pt-2 mt-auto">
              <Button
                onClick={handleMastered}
                className="w-full gap-2"
                variant="default"
              >
                <Sparkles className="w-4 h-4" />
                Mark as Reviewed
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
