import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com";

interface PlanConfig {
  paypalPlanId: string;
  label: string;
  /** Full plan price used to compute a discounted first cycle. */
  fullPrice: number;
  currency: string;
  intervalUnit: "MONTH" | "YEAR";
  intervalCount: number;
}

const PLAN_MAP: Record<string, PlanConfig> = {
  monthly:    { paypalPlanId: "P-6G937167XK6712549NJEWG5I", label: "ArabiyaPath Membership — Monthly",   fullPrice: 30,  currency: "USD", intervalUnit: "MONTH", intervalCount: 1 },
  six_months: { paypalPlanId: "P-8YP45029U5368604VNJEWG5I", label: "ArabiyaPath Membership — 6 Months",  fullPrice: 150, currency: "USD", intervalUnit: "MONTH", intervalCount: 6 },
  yearly:     { paypalPlanId: "P-26E640386G512542KNJEWG5Q", label: "ArabiyaPath Membership — Yearly",    fullPrice: 270, currency: "USD", intervalUnit: "YEAR",  intervalCount: 1 },
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_SECRET")!;
  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plan, couponCode, returnOrigin } = await req.json();
    const planConfig = PLAN_MAP[plan];
    if (!planConfig) throw new Error(`Unknown plan: ${plan}`);

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

    // Resolve coupon → affiliate attribution + first-payment discount.
    // Coupons are ONLY accepted for the Monthly plan. Long-term plans
    // (6 Months, Yearly) already include the maximum discount.
    let couponId: string | null = null;
    let affiliateId: string | null = null;
    let percentOff = 0;
    if (couponCode) {
      if (plan !== "monthly") {
        return new Response(
          JSON.stringify({
            error:
              "Coupons are available only for the Monthly Membership. Long-term plans already include the maximum discount.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, affiliate_id, active, expires_at, percent_off, discount_percent, applies_to, max_redemptions, current_uses")
        .eq("code", String(couponCode).toUpperCase())
        .eq("active", true)
        .maybeSingle();
      if (
        coupon &&
        (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
        (coupon.max_redemptions == null || (coupon.current_uses ?? 0) < coupon.max_redemptions) &&
        (coupon.applies_to == null || coupon.applies_to === "all" || coupon.applies_to === "membership")
      ) {
        couponId = coupon.id;
        affiliateId = coupon.affiliate_id ?? null;
        percentOff = Number(coupon.percent_off ?? coupon.discount_percent ?? 0) || 0;
        percentOff = Math.max(0, Math.min(100, percentOff));
      }
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
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();
    const origin = returnOrigin || req.headers.get("origin") || "https://arabiyapath.com";

    // First-payment-only coupon override.
    // Our v2 plans define TRIAL(seq 1, total_cycles=1) + REGULAR(seq 2,
    // total_cycles=0), both priced at full price. When a coupon is applied we
    // override ONLY the TRIAL cycle's fixed_price at subscription creation.
    // The REGULAR cycle is left untouched so every renewal after the first
    // charge is billed at the full plan price.
    const requestBody: Record<string, unknown> = {
      plan_id: planConfig.paypalPlanId,
      custom_id: userId,
      application_context: {
        brand_name: "ArabiyaPath",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${origin}/membership/activate`,
        cancel_url: `${origin}/membership/continue?plan=${plan}&cancelled=1`,
      },
    };

    if (percentOff > 0) {
      const discounted = Math.max(
        0,
        Math.round((planConfig.fullPrice - planConfig.fullPrice * (percentOff / 100)) * 100) / 100,
      );
      requestBody.plan = {
        billing_cycles: [
          {
            sequence: 1,
            pricing_scheme: {
              fixed_price: { value: discounted.toFixed(2), currency_code: planConfig.currency },
            },
          },
        ],
      };
    }


    const subRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `${userId}-${plan}-${Date.now()}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(requestBody),
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      console.error("PayPal subscription create failed:", errText);
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed?.details?.[0]?.description || parsed?.message || errText;
      } catch { /* keep raw text */ }
      return new Response(
        JSON.stringify({
          error: `PayPal rejected the subscription (${subRes.status}): ${detail}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sub = await subRes.json();
    const approvalUrl = (sub.links || []).find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
    if (!approvalUrl) throw new Error("No approval URL returned by PayPal");

    // Insert local record
    const { error: insErr } = await supabase.from("membership_subscriptions").insert({
      user_id: userId,
      plan,
      paypal_plan_id: planConfig.paypalPlanId,
      paypal_subscription_id: sub.id,
      status: "APPROVAL_PENDING",
      affiliate_id: affiliateId,
      coupon_id: couponId,
    });
    if (insErr) console.error("membership_subscriptions insert error:", insErr);

    return new Response(
      JSON.stringify({ subscriptionId: sub.id, approvalUrl, discountApplied: percentOff > 0 ? percentOff : null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-subscription error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
