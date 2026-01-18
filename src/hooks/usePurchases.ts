import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PurchaseData, hasAccessToLevel, hasAllAccess, hasDialectBundleAccess } from "@/lib/accessControl";

export function usePurchases() {
  const { user } = useAuth();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ["user-purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          product_id,
          status,
          products (
            scope,
            dialect_id,
            level_id
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "completed"]);

      if (error) throw error;
      return data as PurchaseData[];
    },
    enabled: !!user,
  });

  /**
   * Check if user has access to a specific level
   */
  const checkLevelAccess = (
    levelId: string,
    dialectId: string,
    levelOrderIndex?: number,
    unitOrderIndex?: number
  ): boolean => {
    return hasAccessToLevel(purchases, levelId, dialectId, levelOrderIndex, unitOrderIndex);
  };

  /**
   * Check if user has all-access bundle
   */
  const checkAllAccess = (): boolean => {
    return hasAllAccess(purchases);
  };

  /**
   * Check if user has dialect bundle access
   */
  const checkDialectAccess = (dialectId: string): boolean => {
    return hasDialectBundleAccess(purchases, dialectId);
  };

  return {
    purchases,
    isLoading,
    checkLevelAccess,
    checkAllAccess,
    checkDialectAccess,
  };
}
