export interface QuizFeedback {
  emoji: string;
  headline: string;
  body?: string;
}

export function getQuizFeedback(score: number): QuizFeedback {
  if (score >= 100) return { emoji: "🎉", headline: "Perfect! Outstanding work!" };
  if (score >= 90) return { emoji: "🌟", headline: "Excellent!" };
  if (score >= 75) return { emoji: "👍", headline: "Great Progress!" };
  if (score >= 50) return { emoji: "📚", headline: "Keep Practicing!" };
  return {
    emoji: "💪",
    headline: "Don't Give Up!",
    body: "Review the lesson and try again.",
  };
}
