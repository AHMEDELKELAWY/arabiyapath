// Zero-cost Membership activation.
// Used ONLY when a valid coupon reduces the first payment to $0.
// Creates an ACTIVE membership_subscriptions row without ever calling PayPal.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlanConfig {
  fullPrice: number;
  intervalUnit: "MONTH" | "YEAR";
  intervalCount: number;
  paypalPlanId: string; // stored for admin visibility / future upgrade
}

const PLAN_MAP: Record<string, PlanConfig> = {
  monthly:    { fullPrice: 30,  intervalUnit: "MONTH", intervalCount: 1, paypalPlanId: "P-4TD79441C9251073ENJEEFAA" },
  six_months: { fullPrice: 150, intervalUnit: "MONTH", intervalCount: 6, paypalPlanId: "P-7273220749612745YNJEEKGQ" },
  yearly:     { fullPrice: 270, intervalUnit: "YEAR",  intervalCount: 1, paypalPlanId: "P-6PH57317JM699332JNJEEMVI" },
};

function addInterval(from: Date, unit: "MONTH" | "YEAR", count: number): Date {
  const d = new Date(from);
  if (unit === "YEAR") d.setUTCFullYear(d.getUTCFullYear() + count);
  else d.setUTCMonth(d.getUTCMonth() + count);
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plan, couponCode } = await req.json();
    const planConfig = PLAN_MAP[plan];
    if (!planConfig) throw new Error(`Unknown plan: ${plan}`);
    if (!couponCode) throw new Error("Coupon code required for free activation");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Authorization required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) throw new Error("Invalid token");
    const userId = claims.claims.sub as string;

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Server-side coupon validation — MUST resolve to 100% off
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id, affiliate_id, active, expires_at, percent_off, discount_percent, applies_to, max_redemptions, current_uses")
      .eq("code", String(couponCode).toUpperCase())
      .eq("active", true)
      .maybeSingle();

    const valid =
      coupon &&
      (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
      (coupon.max_redemptions == null || (coupon.current_uses ?? 0) < coupon.max_redemptions) &&
      (coupon.applies_to == null || coupon.applies_to === "all" || coupon.applies_to === "membership");

    if (!valid) {
      return new Response(JSON.stringify({ error: "Coupon is invalid or expired." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const percentOff = Math.max(0, Math.min(100, Number(coupon.percent_off ?? coupon.discount_percent ?? 0) || 0));
    const discountAmount = Math.round(planConfig.fullPrice * (percentOff / 100) * 100) / 100;
    const firstPayment = Math.max(0, planConfig.fullPrice - discountAmount);

    if (firstPayment > 0) {
      return new Response(
        JSON.stringify({ error: "This coupon does not fully cover the first payment. Use the PayPal flow." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prevent duplicate active/pending subs
    const { data: existing } = await supabase
      .from("membership_subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["ACTIVE", "APPROVAL_PENDING"])
      .maybeSingle();
    if (existing?.status === "ACTIVE") {
      return new Response(JSON.stringify({ error: "You already have an active membership." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const nextBilling = addInterval(now, planConfig.intervalUnit, planConfig.intervalCount);
    // Synthetic subscription id — no PayPal call. Unique constraint safe.
    const syntheticSubId = `FREE-${crypto.randomUUID()}`;

    const insertPayload = {
      user_id: userId,
      plan,
      paypal_plan_id: planConfig.paypalPlanId,
      paypal_subscription_id: syntheticSubId,
      status: "ACTIVE",
      started_at: now.toISOString(),
      next_billing_at: nextBilling.toISOString(),
      affiliate_id: coupon.affiliate_id ?? null,
      coupon_id: coupon.id,
    };

    let insertedId: string | null = null;
    if (existing?.id) {
      const { data, error } = await supabase
        .from("membership_subscriptions")
        .update(insertPayload)
        .eq("id", existing.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      insertedId = data?.id ?? existing.id;
    } else {
      const { data, error } = await supabase
        .from("membership_subscriptions")
        .insert(insertPayload)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      insertedId = data?.id ?? null;
    }

    // Track coupon redemption
    try {
      await supabase.rpc("increment_coupon_usage", { coupon_id: coupon.id });
      await supabase.from("coupon_redemptions").insert({
        coupon_id: coupon.id,
        user_id: userId,
      });
    } catch (e) {
      console.warn("coupon usage tracking failed:", e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        subscriptionId: insertedId,
        plan,
        originalPrice: planConfig.fullPrice,
        discountAmount,
        firstPayment: 0,
        percentOff,
        redirect: "/dashboard/progress",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("membership-redeem-free error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
