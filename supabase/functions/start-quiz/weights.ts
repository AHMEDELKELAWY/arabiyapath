// Tunable weights for the adaptive quiz picker.
// Kept in a single file for easy A/B tuning.
export const WEIGHTS = {
  DEFAULT_TARGET: 10,
  BASE_SCORE: 1,
  WRONG_BONUS: 0.6,
  WRONG_BONUS_CAP: 1.8,
  CORRECT_PENALTY: 0.25,
  MIN_SCORE: 0.2,
  RECENT_MULTIPLIER: 0.15, // Recent questions are heavily deprioritized.
  DIFFICULTY_MIX: { easy: 0.4, medium: 0.4, hard: 0.2 },
};

export type Difficulty = "easy" | "medium" | "hard";
