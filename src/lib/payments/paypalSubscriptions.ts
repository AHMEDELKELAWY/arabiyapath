import { supabase } from "@/integrations/supabase/client";
import type { MembershipPlanId } from "@/lib/membershipPlans";

export interface CreateSubscriptionResult {
  subscriptionId: string;
  approvalUrl: string;
}

export async function createMembershipSubscription(
  plan: Exclude<MembershipPlanId, "free">,
  opts: { couponCode?: string } = {},
): Promise<CreateSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
    body: {
      plan,
      couponCode: opts.couponCode,
      returnOrigin: window.location.origin,
    },
  });
  if (error) throw error;
  if (!data?.approvalUrl) throw new Error(data?.error || "PayPal did not return an approval URL");
  return { subscriptionId: data.subscriptionId, approvalUrl: data.approvalUrl };
}

export async function activateMembershipSubscription(subscriptionId: string): Promise<{ status: string }> {
  const { data, error } = await supabase.functions.invoke("paypal-activate-subscription", {
    body: { subscriptionId },
  });
  if (error) throw error;
  return { status: data?.status || "APPROVAL_PENDING" };
}
