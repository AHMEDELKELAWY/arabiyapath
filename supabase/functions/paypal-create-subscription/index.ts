import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com";

const PLAN_MAP: Record<string, { paypalPlanId: string; label: string }> = {
  monthly:    { paypalPlanId: "P-4TD79441C9251073ENJEEFAA", label: "ArabiyaPath Membership — Monthly" },
  six_months: { paypalPlanId: "P-7273220749612745YNJEEKGQ", label: "ArabiyaPath Membership — 6 Months" },
  yearly:     { paypalPlanId: "P-6PH57317JM699332JNJEEMVI", label: "ArabiyaPath Membership — Yearly" },
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

    // Resolve coupon → affiliate attribution (reuse existing coupon→affiliate linkage)
    let couponId: string | null = null;
    let affiliateId: string | null = null;
    if (couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, affiliate_id, active, expires_at")
        .eq("code", String(couponCode).toUpperCase())
        .eq("active", true)
        .maybeSingle();
      if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())) {
        couponId = coupon.id;
        affiliateId = coupon.affiliate_id ?? null;
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

    const subRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `${userId}-${plan}-${Date.now()}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
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
      }),
    });

    if (!subRes.ok) {
      const err = await subRes.text();
      console.error("PayPal subscription create failed:", err);
      throw new Error(`PayPal subscription creation failed: ${subRes.status}`);
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
      JSON.stringify({ subscriptionId: sub.id, approvalUrl }),
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
