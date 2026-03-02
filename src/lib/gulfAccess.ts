// Gulf Arabic access gating constants and helpers
// Used to enforce hard redirects for unpurchased Gulf Arabic content

export const GULF_ARABIC_DIALECT_ID = "a1b2c3d4-1111-1111-1111-111111111111";
export const GULF_FREE_LESSON_ID = "d4e5f6a7-0101-0101-0101-000000000001";
export const GULF_SALES_URL = "/gulf-arabic-course#choose-your-plan";

/**
 * Check if a dialect ID belongs to Gulf Arabic
 */
export const isGulfArabic = (dialectId: string | undefined | null): boolean => {
  return dialectId === GULF_ARABIC_DIALECT_ID;
};

/**
 * Check if a lesson is the free Gulf Arabic lesson
 */
export const isGulfFreeLesson = (lessonId: string | undefined | null): boolean => {
  return lessonId === GULF_FREE_LESSON_ID;
};
