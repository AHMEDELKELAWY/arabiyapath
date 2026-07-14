import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Manage a user's own PayPal subscription from ArabiyaPath.
 *
 * Supported actions (all directly supported by the PayPal Subscriptions REST API):
 *   - cancel      → POST /v1/billing/subscriptions/{id}/cancel
 *   - suspend     → POST /v1/billing/subscriptions/{id}/suspend
 *   - reactivate  → POST /v1/billing/subscriptions/{id}/activate
 *   - revise      → POST /v1/billing/subscriptions/{id}/revise    (upgrade / downgrade)
 *
 * Users can only touch their OWN subscription. The row is looked up by
 * membership_subscriptions.id and validated against auth.uid().
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com";

const PLAN_MAP: Record<string, string> = {
  monthly:    "P-4TD79441C9251073ENJEEFAA",
  six_months: "P-7273220749612745YNJEEKGQ",
  yearly:     "P-6PH57317JM699332JNJEEMVI",
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

async function refreshSubscription(supabase: any, subscriptionId: string, accessToken: string) {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return;
  const p = await res.json();
  const patch: Record<string, unknown> = {};
  if (p.status) patch.status = String(p.status).toUpperCase();
  if (p.billing_info?.next_billing_time) patch.next_billing_at = p.billing_info.next_billing_time;
  if (p.start_time) patch.started_at = p.start_time;
  if (p.plan_id) patch.paypal_plan_id = p.plan_id;
  await supabase.from("membership_subscriptions").update(patch).eq("paypal_subscription_id", subscriptionId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, subscriptionRowId, reason, newPlan, returnOrigin } = await req.json();
    if (!action || !subscriptionRowId) throw new Error("action and subscriptionRowId are required");

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

    // Load + ownership check
    const { data: row, error: rowErr } = await supabase
      .from("membership_subscriptions")
      .select("id, user_id, paypal_subscription_id, plan, status")
      .eq("id", subscriptionRowId)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) throw new Error("Subscription not found");
    if (row.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = row.paypal_subscription_id.startsWith("FREE-")
      ? null
      : await getPayPalAccessToken();
    const subId = row.paypal_subscription_id;
    const isFreeSub = subId.startsWith("FREE-");

    async function paypalPost(path: string, body: unknown) {
      const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `${row!.id}-${action}-${Date.now()}`,
          Prefer: "return=representation",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* PayPal returns empty body on 204 */ }
      if (!res.ok) throw new Error(`PayPal ${path} failed: ${res.status} ${text}`);
      return json;
    }

    let extra: Record<string, unknown> = {};

    switch (action) {
      case "cancel": {
        if (!isFreeSub) {
          await paypalPost(`/v1/billing/subscriptions/${subId}/cancel`, {
            reason: reason || "User cancelled from ArabiyaPath dashboard",
          });
        }
        const nowIso = new Date().toISOString();
        await supabase.from("membership_subscriptions").update({
          status: "CANCELLED",
          cancelled_at: nowIso,
        }).eq("id", row.id);
        if (!isFreeSub) await refreshSubscription(supabase, subId, accessToken!);
        break;
      }
      case "suspend": {
        if (isFreeSub) throw new Error("Pausing is not supported for this membership. Please cancel instead.");
        await paypalPost(`/v1/billing/subscriptions/${subId}/suspend`, {
          reason: reason || "User paused from ArabiyaPath dashboard",
        });
        await supabase.from("membership_subscriptions").update({ status: "SUSPENDED" }).eq("id", row.id);
        await refreshSubscription(supabase, subId, accessToken!);
        break;
      }
      case "reactivate": {
        if (isFreeSub) throw new Error("This membership cannot be reactivated automatically.");
        await paypalPost(`/v1/billing/subscriptions/${subId}/activate`, {
          reason: reason || "User resumed from ArabiyaPath dashboard",
        });
        await refreshSubscription(supabase, subId, accessToken!);
        break;
      }
      case "revise": {
        if (isFreeSub) throw new Error("Please contact support to change this membership plan.");
        const targetPlanId = newPlan ? PLAN_MAP[newPlan] : null;
        if (!targetPlanId) throw new Error(`Unknown target plan: ${newPlan}`);
        const origin = returnOrigin || req.headers.get("origin") || "https://arabiyapath.com";
        const revised = await paypalPost(`/v1/billing/subscriptions/${subId}/revise`, {
          plan_id: targetPlanId,
          application_context: {
            brand_name: "ArabiyaPath",
            return_url: `${origin}/membership/activate`,
            cancel_url: `${origin}/dashboard/progress#membership`,
          },
        });
        const approvalUrl = (revised?.links || []).find((l: any) => l.rel === "approve")?.href ?? null;
        await supabase.from("membership_subscriptions").update({
          plan: newPlan,
          paypal_plan_id: targetPlanId,
        }).eq("id", row.id);
        await refreshSubscription(supabase, subId, accessToken!);
        extra = { approvalUrl };
        break;
      }
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ ok: true, action, ...extra }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-subscription error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
