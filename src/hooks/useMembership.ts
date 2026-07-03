import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MembershipStatus =
  | "APPROVAL_PENDING"
  | "ACTIVE"
  | "CANCELLED"
  | "SUSPENDED"
  | "EXPIRED";

export interface MembershipSubscriptionRow {
  id: string;
  plan: "monthly" | "six_months" | "yearly";
  paypal_plan_id: string;
  paypal_subscription_id: string;
  status: MembershipStatus;
  started_at: string | null;
  next_billing_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Fetches the user's most recent membership subscription (if any). */
export function useMembership() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<MembershipSubscriptionRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("membership_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setSubscription((data as MembershipSubscriptionRow | null) ?? null);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const hasActiveAccess = !!subscription && (
    subscription.status === "ACTIVE" ||
    (subscription.status === "CANCELLED" &&
      !!subscription.expires_at &&
      new Date(subscription.expires_at) > new Date())
  );

  return { loading, subscription, hasActiveAccess };
}
