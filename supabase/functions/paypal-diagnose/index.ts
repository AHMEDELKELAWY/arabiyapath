import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://api-m.paypal.com";

async function token() {
  const auth = btoa(`${Deno.env.get("PAYPAL_CLIENT_ID")}:${Deno.env.get("PAYPAL_SECRET")}`);
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  return (await r.json()).access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { subscriptionId, planId, webhooks, repairWebhook } = await req.json();
    const t = await token();
    const out: any = {};
    if (webhooks) {
      const configuredId = Deno.env.get("PAYPAL_WEBHOOK_ID") || null;
      const r = await fetch(`${BASE}/v1/notifications/webhooks`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const list = await r.json().catch(() => null);
      out.webhooks = {
        status: r.status,
        configured_webhook_id_present: !!configuredId,
        configured_webhook_id_tail: configuredId ? configuredId.slice(-6) : null,
        registered: (list?.webhooks || []).map((w: any) => ({
          id_tail: String(w.id).slice(-6),
          url: w.url,
          matches_configured_secret: w.id === configuredId,
          event_types: (w.event_types || []).map((e: any) => e.name),
        })),
      };
    }

    if (subscriptionId) {
      const r = await fetch(`${BASE}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      out.subscription = { status: r.status, body: await r.json().catch(() => null) };
      const tr = await fetch(`${BASE}/v1/billing/subscriptions/${subscriptionId}/transactions?start_time=2020-01-01T00:00:00Z&end_time=2030-01-01T00:00:00Z`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      out.transactions = { status: tr.status, body: await tr.json().catch(() => null) };
    }
    if (planId) {
      const r = await fetch(`${BASE}/v1/billing/plans/${planId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      out.plan = { status: r.status, body: await r.json().catch(() => null) };
    }
    return new Response(JSON.stringify(out, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
