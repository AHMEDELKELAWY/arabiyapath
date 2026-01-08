import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        usersResult,
        purchasesResult,
        quizAttemptsResult,
        certificatesResult,
        couponRedemptionsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
        supabase.from("coupon_redemptions").select("id", { count: "exact", head: true }),
      ]);

      // Quiz attempts last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: quizLast7Days } = await supabase
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // Quiz attempts last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: quizLast30Days } = await supabase
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      return {
        totalUsers: usersResult.count || 0,
        activePurchases: purchasesResult.count || 0,
        totalQuizAttempts: quizAttemptsResult.count || 0,
        quizAttemptsLast7Days: quizLast7Days || 0,
        quizAttemptsLast30Days: quizLast30Days || 0,
        certificatesIssued: certificatesResult.count || 0,
        couponRedemptions: couponRedemptionsResult.count || 0,
      };
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const [signups, purchasesData, certificatesData] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, first_name, last_name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("purchases")
          .select("id, status, created_at, product_id, user_id, products(name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("certificates")
          .select("id, cert_code, issued_at, user_id, dialects(name), levels(name)")
          .order("issued_at", { ascending: false })
          .limit(5),
      ]);

      // Fetch profiles for purchases
      const purchaseUserIds = purchasesData.data?.map(p => p.user_id) || [];
      const { data: purchaseProfiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", purchaseUserIds);

      const purchases = purchasesData.data?.map(p => ({
        ...p,
        profile: purchaseProfiles?.find(pr => pr.user_id === p.user_id)
      })) || [];

      // Fetch profiles for certificates
      const certUserIds = certificatesData.data?.map(c => c.user_id) || [];
      const { data: certProfiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", certUserIds);

      const certificates = certificatesData.data?.map(c => ({
        ...c,
        profile: certProfiles?.find(pr => pr.user_id === c.user_id)
      })) || [];

      return {
        recentSignups: signups.data || [],
        recentPurchases: purchases,
        recentCertificates: certificates,
      };
    },
  });
}

export function useDialects() {
  return useQuery({
    queryKey: ["dialects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dialects")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useLevels(dialectId?: string) {
  return useQuery({
    queryKey: ["levels", dialectId],
    queryFn: async () => {
      let query = supabase.from("levels").select("*, dialects(name)").order("order_index");
      if (dialectId) {
        query = query.eq("dialect_id", dialectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUnits(levelId?: string) {
  return useQuery({
    queryKey: ["units", levelId],
    queryFn: async () => {
      let query = supabase.from("units").select("*, levels(name, dialects(name))").order("order_index");
      if (levelId) {
        query = query.eq("level_id", levelId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useLessons(unitId?: string) {
  return useQuery({
    queryKey: ["lessons", unitId],
    queryFn: async () => {
      let query = supabase
        .from("lessons")
        .select("*, units(title, levels(name, dialects(name)))")
        .order("order_index");
      if (unitId) {
        query = query.eq("unit_id", unitId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch all user roles
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Map roles to profiles
      return profiles?.map(p => ({
        ...p,
        roles: roles?.filter(r => r.user_id === p.user_id) || []
      })) || [];
    },
  });
}

export function useAdminUserDetails(userId: string) {
  return useQuery({
    queryKey: ["admin-user-details", userId],
    queryFn: async () => {
      const [profile, roles, progress, quizAttempts, purchases, certificates] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("*").eq("user_id", userId),
        supabase
          .from("user_progress")
          .select("*, lessons(title, units(title, levels(name, dialects(name))))")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false }),
        supabase
          .from("quiz_attempts")
          .select("*, quizzes(units(title, levels(name, dialects(name))))")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("purchases")
          .select("*, products(name, scope, dialects(name))")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("certificates")
          .select("*, dialects(name), levels(name)")
          .eq("user_id", userId)
          .order("issued_at", { ascending: false }),
      ]);

      return {
        profile: profile.data,
        roles: roles.data || [],
        progress: progress.data || [],
        quizAttempts: quizAttempts.data || [],
        purchases: purchases.data || [],
        certificates: certificates.data || [],
      };
    },
    enabled: !!userId,
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCouponAnalytics(couponId: string) {
  return useQuery({
    queryKey: ["coupon-analytics", couponId],
    queryFn: async () => {
      const { data: redemptions, error } = await supabase
        .from("coupon_redemptions")
        .select("*")
        .eq("coupon_id", couponId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for redemptions
      const userIds = redemptions?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      return redemptions?.map(r => ({
        ...r,
        profile: profiles?.find(p => p.user_id === r.user_id)
      })) || [];
    },
    enabled: !!couponId,
  });
}

export function useAdminPurchases() {
  return useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
      const { data: purchases, error } = await supabase
        .from("purchases")
        .select("*, products(name, price, scope)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for purchases
      const userIds = purchases?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      return purchases?.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.user_id === p.user_id)
      })) || [];
    },
  });
}

export function useAdminCertificates() {
  return useQuery({
    queryKey: ["admin-certificates"],
    queryFn: async () => {
      const { data: certificates, error } = await supabase
        .from("certificates")
        .select("*, dialects(name), levels(name)")
        .order("issued_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for certificates
      const userIds = certificates?.map(c => c.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds);

      return certificates?.map(c => ({
        ...c,
        profile: profiles?.find(p => p.user_id === c.user_id)
      })) || [];
    },
  });
}
