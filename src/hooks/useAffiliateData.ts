import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAffiliateProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAffiliateStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get affiliate ID first
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, total_earnings, paid_earnings")
        .eq("user_id", user.id)
        .single();

      if (!affiliate) return null;

      // Get total referrals count
      const { count: totalReferrals } = await supabase
        .from("purchases")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id);

      // Get pending commissions
      const { data: pendingCommissions } = await supabase
        .from("affiliate_commissions")
        .select("commission_amount")
        .eq("affiliate_id", affiliate.id)
        .eq("status", "pending");

      const pendingAmount = pendingCommissions?.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0
      ) || 0;

      // Get this month's earnings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyCommissions } = await supabase
        .from("affiliate_commissions")
        .select("commission_amount")
        .eq("affiliate_id", affiliate.id)
        .gte("created_at", startOfMonth.toISOString());

      const monthlyEarnings = monthlyCommissions?.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0
      ) || 0;

      return {
        totalEarnings: Number(affiliate.total_earnings) || 0,
        paidEarnings: Number(affiliate.paid_earnings) || 0,
        pendingAmount,
        totalReferrals: totalReferrals || 0,
        monthlyEarnings,
      };
    },
    enabled: !!user,
  });
}

export function useAffiliateCommissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-commissions", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get affiliate ID first
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!affiliate) return [];

      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select(`
          *,
          purchases (
            product_name,
            amount,
            created_at,
            products (name)
          )
        `)
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useAffiliateReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-referrals", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get affiliate ID first
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!affiliate) return [];

      const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          product_name,
          amount,
          created_at,
          user_id,
          products (name)
        `)
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useAffiliateCoupon() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["affiliate-coupon", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get affiliate ID first
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, affiliate_code")
        .eq("user_id", user.id)
        .single();

      if (!affiliate) return null;

      // Get coupon linked to this affiliate
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .maybeSingle();

      return {
        affiliateCode: affiliate.affiliate_code,
        coupon,
      };
    },
    enabled: !!user,
  });
}

// Admin hooks
export function useAdminAffiliates() {
  return useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select(`
          *,
          coupons (id, code, percent_off)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profiles for all affiliates
      const userIds = data?.map((a) => a.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return data?.map((affiliate) => ({
        ...affiliate,
        profile: profilesMap.get(affiliate.user_id),
      })) || [];
    },
  });
}

export function useAdminAffiliateCommissions(affiliateId?: string) {
  return useQuery({
    queryKey: ["admin-affiliate-commissions", affiliateId],
    queryFn: async () => {
      let query = supabase
        .from("affiliate_commissions")
        .select(`
          *,
          affiliates (
            id,
            affiliate_code,
            user_id
          ),
          purchases (
            product_name,
            amount,
            user_id,
            products (name)
          )
        `)
        .order("created_at", { ascending: false });

      if (affiliateId) {
        query = query.eq("affiliate_id", affiliateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: affiliateId ? true : true,
  });
}

export function useAdminPendingPayouts() {
  return useQuery({
    queryKey: ["admin-pending-payouts"],
    queryFn: async () => {
      // Get all affiliates with pending commissions
      const { data: affiliates, error } = await supabase
        .from("affiliates")
        .select("*")
        .order("total_earnings", { ascending: false });

      if (error) throw error;

      // Get profiles
      const userIds = affiliates?.map((a) => a.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Get pending commissions for each affiliate
      const results = await Promise.all(
        (affiliates || []).map(async (affiliate) => {
          const { data: pendingCommissions } = await supabase
            .from("affiliate_commissions")
            .select("id, commission_amount")
            .eq("affiliate_id", affiliate.id)
            .eq("status", "pending");

          const pendingAmount = pendingCommissions?.reduce(
            (sum, c) => sum + Number(c.commission_amount),
            0
          ) || 0;

          return {
            ...affiliate,
            profile: profilesMap.get(affiliate.user_id),
            pendingAmount,
            pendingCount: pendingCommissions?.length || 0,
          };
        })
      );

      return results.filter((r) => r.pendingAmount > 0);
    },
  });
}
