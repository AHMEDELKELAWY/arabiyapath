import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_user_id: string | null;
  meta: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export function useAdminNotifications(limit = 50) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["admin-notifications", limit],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AdminNotification[];
    },
  });
}

export function useAdminUnreadNotificationsCount() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["admin-notifications-unread"],
    enabled: isAdmin === true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_unread_notifications_count");
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications-unread"] });
    },
  });
}
