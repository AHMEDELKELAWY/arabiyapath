import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/**
 * Returns whether the current user can study a flashcard unit (free unit OR purchased pack containing it).
 */
export function useFlashcardUnitAccess(unitId: string | undefined) {
  return useQuery({
    queryKey: ["fc-unit-access", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      if (!unitId) return false;
      const { data, error } = await (supabase.rpc as any)("fc_user_can_study_unit", {
        _user_id: (await supabase.auth.getUser()).data.user?.id,
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
