import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_SECRET")!;
  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal auth failed");
  return (await res.json()).access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subscriptionId } = await req.json();
    if (!subscriptionId) throw new Error("subscriptionId required");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Authorization required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) throw new Error("Invalid token");
    const userId = claims.claims.sub as string;

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: row, error: rowErr } = await supabase
      .from("membership_subscriptions")
      .select("id, user_id, status")
      .eq("paypal_subscription_id", subscriptionId)
      .maybeSingle();
    if (rowErr || !row) throw new Error("Subscription not found");
    if (row.user_id !== userId) throw new Error("Not your subscription");

    const accessToken = await getPayPalAccessToken();
    const pRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!pRes.ok) throw new Error(`PayPal fetch failed: ${pRes.status}`);
    const p = await pRes.json();

    const status = String(p.status || "").toUpperCase();
    const mappedStatus =
      ["ACTIVE", "APPROVAL_PENDING", "CANCELLED", "SUSPENDED", "EXPIRED"].includes(status)
        ? status
        : "APPROVAL_PENDING";

    const update: Record<string, unknown> = { status: mappedStatus };
    if (p.start_time) update.started_at = p.start_time;
    if (p.billing_info?.next_billing_time) update.next_billing_at = p.billing_info.next_billing_time;

    const { error: updErr } = await supabase
      .from("membership_subscriptions")
      .update(update)
      .eq("id", row.id);
    if (updErr) console.error("update error:", updErr);

    return new Response(JSON.stringify({ status: mappedStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("activate-subscription error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
