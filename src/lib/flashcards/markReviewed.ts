/**
 * Mark a set of flashcards as reviewed for the current user.
 *
 * This is the *engine-side* completion hook the lesson activities call when a
 * learner finishes Learn / Listening / Speaking / Grammar / Test Yourself.
 * It writes rows into `public.flashcard_progress` (RLS: users can insert/update
 * their own) so `fc_dashboard_summary` — which powers the dashboard, level
 * progress bar, Resume Learning and unit cards — sees the change immediately.
 *
 * Rules:
 *  - The **database** is the source of truth for progress.
 *  - The call is idempotent: existing rows are updated (last_reviewed_at bump),
 *    no duplicates.
 *  - After a successful write, all progress-related React Query caches are
 *    invalidated so every screen (Dashboard, Course, Level, Units, Resume)
 *    reflects the new numbers with no page refresh.
 */

import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort progress write. NEVER throws — a flaky network must not
 * prevent the learner from seeing the completion screen. Server progress
 * is refreshed via cache invalidation whenever the write succeeds.
 */
export async function markCardsReviewed(
  userId: string | null | undefined,
  cardIds: string[],
  queryClient?: QueryClient
): Promise<number> {
  if (!userId || !cardIds.length) return 0;
  const uniqueIds = Array.from(new Set(cardIds.filter(Boolean)));
  if (!uniqueIds.length) return 0;

  let reviewedCount = 0;
  try {
    const { data, error } = await (supabase as any)
      .rpc("fc_mark_cards_reviewed", { _card_ids: uniqueIds });
    if (error) {
      console.warn("[markCardsReviewed] rpc error (non-fatal)", error);
      return 0;
    }
    reviewedCount = Number(data) || 0;
    if (reviewedCount !== uniqueIds.length) {
      console.warn(
        `[markCardsReviewed] partial write: ${reviewedCount}/${uniqueIds.length}`
      );
    }
  } catch (err) {
    console.warn("[markCardsReviewed] threw (non-fatal)", err);
    return 0;
  }

  if (queryClient && reviewedCount > 0) {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["fc-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["fc-resume-slug"] }),
        queryClient.invalidateQueries({ queryKey: ["fc-resume-db"] }),
        queryClient.invalidateQueries({ queryKey: ["fc-units-public"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    } catch (err) {
      console.warn("[markCardsReviewed] invalidate failed", err);
    }
  }
  return reviewedCount;
}
