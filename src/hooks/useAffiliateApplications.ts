import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AffiliateApplication {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  how_will_promote: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ApplicationWithProfile extends AffiliateApplication {
  email?: string | null;
}

// Hook for users to check their own application status
export function useMyAffiliateApplication() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-affiliate-application", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("affiliate_applications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AffiliateApplication | null;
    },
    enabled: !!user,
  });
}

// Hook for users to submit an application
export function useSubmitAffiliateApplication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      full_name: string;
      phone?: string;
      how_will_promote: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: inserted, error } = await supabase
        .from("affiliate_applications")
        .insert({
          user_id: user.id,
          full_name: data.full_name,
          phone: data.phone || null,
          how_will_promote: data.how_will_promote,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Fire-and-forget admin notification email
      if (inserted?.id) {
        try {
          await supabase.functions.invoke(
            "notify-admin-affiliate-application",
            { body: { applicationId: inserted.id } },
          );
        } catch (notifyErr) {
          console.error("Failed to notify admin:", notifyErr);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-affiliate-application"] });
    },
  });
}

// Admin hook to fetch all applications with profile emails
export function useAdminAffiliateApplications() {
  return useQuery({
    queryKey: ["admin-affiliate-applications"],
    queryFn: async () => {
      // First fetch applications
      const { data: applications, error } = await supabase
        .from("affiliate_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Then fetch profiles for these users
      if (applications && applications.length > 0) {
        const userIds = applications.map((app) => app.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, first_name, last_name")
          .in("user_id", userIds);

        // Merge profiles with applications
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        return applications.map((app) => ({
          ...app,
          email: profileMap.get(app.user_id)?.email || null,
        })) as ApplicationWithProfile[];
      }

      return applications as ApplicationWithProfile[];
    },
  });
}

export type CouponOption =
  | { mode: "skip" }
  | {
      mode: "create";
      code: string;
      percentOff: number;
      expiresAt?: string | null;
    }
  | { mode: "link"; couponId: string };

// Admin hook to approve an application
export function useApproveAffiliateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      userId,
      affiliateCode,
      commissionRate = 10,
      email,
      fullName,
      coupon = { mode: "skip" },
    }: {
      applicationId: string;
      userId: string;
      affiliateCode: string;
      commissionRate?: number;
      email?: string;
      fullName: string;
      coupon?: CouponOption;
    }) => {
      // 1. Update application status
      const { error: updateError } = await supabase
        .from("affiliate_applications")
        .update({ status: "approved" })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // 2. Create affiliate record
      const { data: affiliateRow, error: affiliateError } = await supabase
        .from("affiliates")
        .insert({
          user_id: userId,
          affiliate_code: affiliateCode,
          commission_rate: commissionRate,
          status: "active",
        })
        .select("id")
        .single();

      if (affiliateError) throw affiliateError;

      // 3. Add affiliate role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "affiliate",
      });

      if (roleError) throw roleError;

      // 4. Coupon: create new or link existing
      let attachedCouponCode: string | undefined;
      let attachedCouponPercent: number | undefined;

      if (coupon.mode === "create" && affiliateRow?.id) {
        const code = coupon.code.trim().toUpperCase();
        const { data: createdCoupon, error: couponErr } = await supabase
          .from("coupons")
          .insert({
            code,
            percent_off: coupon.percentOff,
            discount_percent: coupon.percentOff,
            affiliate_id: affiliateRow.id,
            expires_at: coupon.expiresAt || null,
            active: true,
            applies_to: "all",
          })
          .select("code, percent_off")
          .single();
        if (couponErr) throw couponErr;
        attachedCouponCode = createdCoupon.code;
        attachedCouponPercent = createdCoupon.percent_off;
      } else if (coupon.mode === "link" && affiliateRow?.id) {
        const { data: linkedCoupon, error: linkErr } = await supabase
          .from("coupons")
          .update({ affiliate_id: affiliateRow.id })
          .eq("id", coupon.couponId)
          .select("code, percent_off")
          .single();
        if (linkErr) throw linkErr;
        attachedCouponCode = linkedCoupon.code;
        attachedCouponPercent = linkedCoupon.percent_off;
      }

      // 5. Send welcome email (non-blocking)
      if (email) {
        try {
          await supabase.functions.invoke("send-affiliate-welcome-email", {
            body: {
              email,
              fullName,
              affiliateCode,
              commissionRate,
              couponCode: attachedCouponCode,
              couponPercentOff: attachedCouponPercent,
            },
          });
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-affiliate-applications"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-unlinked-coupons"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-pending-applications-count"],
      });
    },
  });
}

// Hook for admins to fetch coupons not yet linked to any affiliate
export function useUnlinkedCoupons() {
  return useQuery({
    queryKey: ["admin-unlinked-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("id, code, percent_off, active")
        .is("affiliate_id", null)
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });
}

// Hook for sidebar badge: pending application count
export function usePendingApplicationsCount() {
  return useQuery({
    queryKey: ["admin-pending-applications-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_pending_applications_count",
      );
      if (error) throw error;
      return (data as number) || 0;
    },
    refetchInterval: 60_000,
  });
}

// Admin hook to reject an application
export function useRejectAffiliateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      adminNotes,
    }: {
      applicationId: string;
      adminNotes?: string;
    }) => {
      const { error } = await supabase
        .from("affiliate_applications")
        .update({
          status: "rejected",
          admin_notes: adminNotes || null,
        })
        .eq("id", applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-affiliate-applications"],
      });
    },
  });
}
