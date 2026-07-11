/**
 * Spoken Arabic — Resume Learning helper.
 *
 * Persists the student's last position in Spoken Arabic study to
 * localStorage so the "Resume Learning" button can drop them back
 * into the exact tab of the exact unit they left.
 *
 * Storage is UI-only. Progress, streaks, SRS scheduling and
 * entitlements are unaffected.
 */

export type SpokenArabicTab =
  | "learn"
  | "listening"
  | "speaking"
  | "grammar"
  | "test";

export interface SpokenArabicResumeState {
  unitSlug: string;
  tab: SpokenArabicTab;
  cardIndex?: number;
  updatedAt: number;
}

const KEY = "arabiyapath.spokenArabic.resume.v1";

export function loadSpokenArabicResume(): SpokenArabicResumeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpokenArabicResumeState;
    if (!parsed?.unitSlug || !parsed?.tab) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSpokenArabicResume(
  next: Omit<SpokenArabicResumeState, "updatedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...next, updatedAt: Date.now() })
    );
  } catch {
    /* ignore quota errors */
  }
}

export function clearSpokenArabicResume(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function buildUnitResumeHref(
  unitSlug: string,
  tab?: SpokenArabicTab
): string {
  const base = `/flashcards/unit/${unitSlug}`;
  return tab ? `${base}?tab=${tab}` : base;
}
