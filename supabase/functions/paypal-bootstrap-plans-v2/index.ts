// One-off admin bootstrap: creates a Product + 3 v2 Plans on PayPal LIVE.
// Each plan has TRIAL(seq 1, total_cycles=1) + REGULAR(seq 2, total_cycles=0),
// both priced at the full plan price. First-payment coupons will later
// override ONLY the TRIAL cycle's pricing_scheme.fixed_price at subscription
// creation time.
//
// Auth: must be called by an authenticated admin user. Idempotent-ish per
// call thanks to PayPal-Request-Id derived from the config below — repeated
// calls with the same request id return the same plan.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com";
const REQUEST_TAG = "v2-2026-01"; // bump to force new plan IDs

interface PlanSpec {
  key: "monthly" | "six_months" | "yearly";
  name: string;
  description: string;
  price: string;
  intervalUnit: "MONTH" | "YEAR";
  intervalCount: number;
}

const PLANS: PlanSpec[] = [
  { key: "monthly",    name: "ArabiyaPath Membership — Monthly v2",   description: "Monthly recurring membership.",          price: "30.00",  intervalUnit: "MONTH", intervalCount: 1 },
  { key: "six_months", name: "ArabiyaPath Membership — 6 Months v2",  description: "Recurring every 6 months.",              price: "150.00", intervalUnit: "MONTH", intervalCount: 6 },
  { key: "yearly",     name: "ArabiyaPath Membership — Yearly v2",    description: "Yearly recurring membership.",           price: "270.00", intervalUnit: "YEAR",  intervalCount: 1 },
];

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
    // Admin gate
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
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const accessToken = await getPayPalAccessToken();

    // 1) Create Product
    const productReqId = `arabiyapath-membership-product-${REQUEST_TAG}`;
    const productRes = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": productReqId,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: "ArabiyaPath Membership",
        description: "Recurring membership access to ArabiyaPath.",
        type: "SERVICE",
        category: "EDUCATIONAL_AND_TEXTBOOKS",
        home_url: "https://arabiyapath.com",
      }),
    });
    const productText = await productRes.text();
    if (!productRes.ok) {
      return new Response(JSON.stringify({ step: "create-product", status: productRes.status, body: productText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const product = JSON.parse(productText);
    const productId = product.id as string;

    // 2) Create the 3 plans
    const results: Array<Record<string, unknown>> = [];
    for (const spec of PLANS) {
      const body = {
        product_id: productId,
        name: spec.name,
        description: spec.description,
        status: "ACTIVE",
        billing_cycles: [
          {
            frequency: { interval_unit: spec.intervalUnit, interval_count: spec.intervalCount },
            tenure_type: "TRIAL",
            sequence: 1,
            total_cycles: 1,
            pricing_scheme: { fixed_price: { value: spec.price, currency_code: "USD" } },
          },
          {
            frequency: { interval_unit: spec.intervalUnit, interval_count: spec.intervalCount },
            tenure_type: "REGULAR",
            sequence: 2,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: spec.price, currency_code: "USD" } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: { value: "0", currency_code: "USD" },
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 2,
        },
        taxes: { percentage: "0", inclusive: false },
      };
      const planReqId = `arabiyapath-membership-plan-${spec.key}-${REQUEST_TAG}`;
      const planRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": planReqId,
          Prefer: "return=representation",
        },
        body: JSON.stringify(body),
      });
      const planText = await planRes.text();
      if (!planRes.ok) {
        results.push({ key: spec.key, ok: false, status: planRes.status, body: planText, request: body });
        continue;
      }
      const plan = JSON.parse(planText);
      results.push({ key: spec.key, ok: true, planId: plan.id, name: plan.name, status: plan.status });
    }

    return new Response(JSON.stringify({ productId, plans: results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
