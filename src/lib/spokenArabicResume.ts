/**
 * Spoken Arabic — Resume Learning helper.
 *
 * The **database** (`public.user_learning_position`) is the source of truth
 * so Resume works across devices. localStorage is kept as a fast local cache
 * for instant hydration before the DB round-trip completes.
 */

import { supabase } from "@/integrations/supabase/client";

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
  questionIndex?: number;
  updatedAt: number;
}

export async function resolveSpokenArabicResume(
  userId?: string | null
): Promise<SpokenArabicResumeState | null> {
  if (userId) {
    const databasePosition = await fetchSpokenArabicResume(userId);
    if (databasePosition) return databasePosition;
  }
  return loadSpokenArabicResume();
}

const KEY = "arabiyapath.spokenArabic.resume.v1";
const COURSE_SLUG = "spoken-arabic";
const LEVEL_SLUG = "beginner";

// ── localStorage cache ────────────────────────────────────────────────────
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

function writeCache(next: Omit<SpokenArabicResumeState, "updatedAt">): void {
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

// ── Database sync (source of truth) ───────────────────────────────────────

/**
 * Persist the student's position to the database (upsert) and mirror to the
 * localStorage cache. Silent on error — resume is a UX convenience, not
 * critical path.
 */
export async function saveSpokenArabicResume(
  next: Omit<SpokenArabicResumeState, "updatedAt">,
  userId?: string | null
): Promise<void> {
  writeCache(next);
  if (!userId) return;
  try {
    const { error } = await (supabase as any)
      .from("user_learning_position")
      .upsert(
        {
          user_id: userId,
          course_slug: COURSE_SLUG,
          level_slug: LEVEL_SLUG,
          unit_slug: next.unitSlug,
          tab: next.tab,
          card_index: next.cardIndex ?? null,
          question_index: next.questionIndex ?? null,
        },
        { onConflict: "user_id,course_slug" }
      );
    if (error) throw error;
  } catch (err) {
    console.warn("[spokenArabicResume] db upsert failed", err);
  }
}

/**
 * Merge a newly changed index with the authoritative saved position. This
 * prevents a parent tab render from replacing a card/question index with null.
 */
export async function saveSpokenArabicResumePosition(
  next: Omit<SpokenArabicResumeState, "updatedAt">,
  userId?: string | null
): Promise<void> {
  const cached = loadSpokenArabicResume();
  const merged = cached?.unitSlug === next.unitSlug && cached.tab === next.tab
    ? {
        ...cached,
        ...next,
        cardIndex: next.cardIndex ?? cached.cardIndex,
        questionIndex: next.questionIndex ?? cached.questionIndex,
      }
    : next;
  await saveSpokenArabicResume(merged, userId);
}

/**
 * Read the authoritative position from the database. Falls back to `null`
 * so callers can then consult the cache or compute a default.
 */
export async function fetchSpokenArabicResume(
  userId: string
): Promise<SpokenArabicResumeState | null> {
  try {
    const { data, error } = await (supabase as any)
      .from("user_learning_position")
      .select("unit_slug, tab, card_index, question_index, updated_at")
      .eq("user_id", userId)
      .eq("course_slug", COURSE_SLUG)
      .maybeSingle();
    if (error || !data) return null;
    const tab = (data.tab ?? "learn") as SpokenArabicTab;
    return {
      unitSlug: data.unit_slug,
      tab,
      cardIndex: data.card_index ?? undefined,
      questionIndex: data.question_index ?? undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
    };
  } catch {
    return null;
  }
}
