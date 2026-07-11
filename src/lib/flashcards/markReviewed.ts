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

export async function markCardsReviewed(
  userId: string | null | undefined,
  cardIds: string[],
  queryClient?: QueryClient
): Promise<void> {
  if (!userId || !cardIds.length) return;
  const uniqueIds = Array.from(new Set(cardIds.filter(Boolean)));
  if (!uniqueIds.length) return;

  try {
    const now = new Date().toISOString();
    const rows = uniqueIds.map((flashcard_id) => ({
      user_id: userId,
      flashcard_id,
      status: "review" as const,
      last_reviewed_at: now,
    }));

    const { error } = await (supabase as any)
      .from("flashcard_progress")
      .upsert(rows, { onConflict: "user_id,flashcard_id", ignoreDuplicates: false });
    if (error) {
      console.warn("[markCardsReviewed] upsert failed", error);
      return;
    }
  } catch (err) {
    console.warn("[markCardsReviewed] threw", err);
    return;
  }

  if (queryClient) {
    // Any screen showing unit/level/course/dashboard progress needs a refresh.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["fc-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["fc-resume-slug"] }),
      queryClient.invalidateQueries({ queryKey: ["fc-resume-db"] }),
      queryClient.invalidateQueries({ queryKey: ["fc-units-public"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }
}
