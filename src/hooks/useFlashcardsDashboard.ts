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
