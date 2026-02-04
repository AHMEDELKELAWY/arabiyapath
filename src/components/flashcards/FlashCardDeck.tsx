import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashCard } from "./FlashCard";
import { cn } from "@/lib/utils";
import type { FlashCard as FlashCardType } from "@/data/flashCardsData";

interface FlashCardDeckProps {
  cards: FlashCardType[];
  onCardReviewed: (cardId: string) => void;
  reviewedCards: Set<string>;
}

export function FlashCardDeck({
  cards,
  onCardReviewed,
  reviewedCards,
}: FlashCardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deckCards, setDeckCards] = useState(cards);

  useEffect(() => {
    setDeckCards(cards);
    setCurrentIndex(0);
  }, [cards]);

  const currentCard = deckCards[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : deckCards.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < deckCards.length - 1 ? prev + 1 : 0));
  };

  const shuffleDeck = () => {
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
    setDeckCards(shuffled);
    setCurrentIndex(0);
  };

  const resetDeck = () => {
    setDeckCards(cards);
    setCurrentIndex(0);
  };

  const handleMastered = () => {
    if (currentCard) {
      onCardReviewed(currentCard.id);
      // Auto-advance after marking as reviewed
      setTimeout(() => {
        goToNext();
      }, 700);
    }
  };

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No cards available for this level.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card counter and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {deckCards.length}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {reviewedCards.size} reviewed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={shuffleDeck} className="gap-1">
            <Shuffle className="w-3 h-3" />
            <span className="hidden sm:inline">Shuffle</span>
          </Button>
          <Button variant="outline" size="sm" onClick={resetDeck} className="gap-1">
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 flex-wrap max-w-md mx-auto">
        {deckCards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-200",
              idx === currentIndex
                ? "bg-primary scale-125"
                : reviewedCards.has(card.id)
                ? "bg-green-500/60 hover:bg-green-500"
                : "bg-muted hover:bg-muted-foreground/30"
            )}
            aria-label={`Go to card ${idx + 1}`}
          />
        ))}
      </div>

      {/* Flash card */}
      <div className="relative">
        <FlashCard
          card={currentCard}
          onMastered={handleMastered}
          isReviewed={reviewedCards.has(currentCard.id)}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={goToPrevious}
          className="gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={goToNext}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
