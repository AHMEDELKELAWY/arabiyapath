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

      const { error } = await supabase.from("affiliate_applications").insert({
        user_id: user.id,
        full_name: data.full_name,
        phone: data.phone || null,
        how_will_promote: data.how_will_promote,
      });

      if (error) throw error;
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

// Admin hook to approve an application
export function useApproveAffiliateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      userId,
      affiliateCode,
      commissionRate = 10,
    }: {
      applicationId: string;
      userId: string;
      affiliateCode: string;
      commissionRate?: number;
    }) => {
      // 1. Update application status
      const { error: updateError } = await supabase
        .from("affiliate_applications")
        .update({ status: "approved" })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // 2. Create affiliate record
      const { error: affiliateError } = await supabase
        .from("affiliates")
        .insert({
          user_id: userId,
          affiliate_code: affiliateCode,
          commission_rate: commissionRate,
          status: "active",
        });

      if (affiliateError) throw affiliateError;

      // 3. Add affiliate role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "affiliate",
      });

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-affiliate-applications"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
    },
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
