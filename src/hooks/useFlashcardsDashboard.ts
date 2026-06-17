import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FlashcardsDashboardSummary {
  streak: { current_streak: number; longest_streak: number; last_active_date: string | null } | null;
  due_today: number;
  total_mastered: number;
  units: Array<{ unit_id: string; slug: string; title: string; total: number; mastered: number }>;
  purchases: Array<{
    id: string;
    pack_id: string;
    status: string;
    amount_cents: number;
    currency: string;
    purchased_at: string | null;
  }>;
}

export function useFlashcardsDashboard() {
  const { user } = useAuth();
  return useQuery<FlashcardsDashboardSummary>({
    queryKey: ["fc-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("fc_dashboard_summary");
      if (error) throw error;
      return (data as FlashcardsDashboardSummary) ?? {
        streak: null, due_today: 0, total_mastered: 0, units: [], purchases: [],
      };
    },
  });
}

/**
 * Returns the slug of the user's most recently studied flashcard unit (read-only).
 * Used by the dashboard "Continue" button to resume learning immediately.
 */
export function useFlashcardsResumeSlug() {
  const { user } = useAuth();
  return useQuery<string | null>({
    queryKey: ["fc-resume-slug", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_progress")
        .select("last_reviewed_at, flashcards!inner(unit_id, flashcard_units!inner(slug, published))")
        .eq("user_id", user!.id)
        .eq("flashcards.flashcard_units.published", true)
        .order("last_reviewed_at", { ascending: false, nullsFirst: false })
        .limit(1);
      if (error) {
        console.error("[useFlashcardsResumeSlug]", error);
        return null;
      }
      const row = Array.isArray(data) ? data[0] : null;
      const slug = row?.flashcards?.flashcard_units?.slug ?? null;
      return slug ?? null;
    },
  });
}
