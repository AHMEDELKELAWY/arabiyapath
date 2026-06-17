import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns whether the current user can study a flashcard unit
 * (free unit OR purchased pack containing it — checked server-side).
 *
 * The query key includes the user id so a cached `false` from a logged-out
 * or pre-purchase session never carries over to a logged-in/purchased state.
 */
export function useFlashcardUnitAccess(unitId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fc-unit-access", unitId, user?.id ?? "anon"],
    enabled: !!unitId,
    queryFn: async () => {
      if (!unitId) return false;
      const { data, error } = await (supabase.rpc as any)("fc_user_can_study_unit", {
        _user_id: user?.id ?? null,
        _unit_id: unitId,
      });
      if (error) {
        console.error("[flashcardAccess]", error);
        return false;
      }
      return !!data;
    },
  });
}
