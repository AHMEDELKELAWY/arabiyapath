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
    const { subscriptionId, planId, webhooks, repairWebhook, simulateEvents } = await req.json();
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

    // Repair mode: force PayPal's registration to point at the real edge
    // function URL and subscribe every event the handler implements.
    if (repairWebhook) {
      const TARGET_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/paypal-webhook`;
      const EVENTS = [
        "BILLING.SUBSCRIPTION.CREATED",
        "BILLING.SUBSCRIPTION.ACTIVATED",
        "BILLING.SUBSCRIPTION.CANCELLED",
        "BILLING.SUBSCRIPTION.SUSPENDED",
        "BILLING.SUBSCRIPTION.EXPIRED",
        "PAYMENT.SALE.COMPLETED",
        "PAYMENT.SALE.DENIED",
        "PAYMENT.SALE.REFUNDED",
        "PAYMENT.CAPTURE.COMPLETED",
        "PAYMENT.CAPTURE.DENIED",
        "PAYMENT.CAPTURE.REFUNDED",
        "CHECKOUT.ORDER.APPROVED",
      ].map((name) => ({ name }));

      const listRes = await fetch(`${BASE}/v1/notifications/webhooks`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const existing = (await listRes.json().catch(() => ({})))?.webhooks || [];
      const steps: any[] = [];
      let finalId: string | null = null;

      // Reuse an existing hook (PayPal allows a limited number per app).
      const reuse = existing.find((w: any) => w.url === TARGET_URL) || existing[0];
      if (reuse) {
        const patchRes = await fetch(`${BASE}/v1/notifications/webhooks/${reuse.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify([
            { op: "replace", path: "/url", value: TARGET_URL },
            { op: "replace", path: "/event_types", value: EVENTS },
          ]),
        });
        const patched = await patchRes.json().catch(() => null);
        steps.push({ action: "patch", status: patchRes.status, detail: patchRes.ok ? null : patched });
        if (patchRes.ok) finalId = patched.id;
      }

      if (!finalId) {
        const createRes = await fetch(`${BASE}/v1/notifications/webhooks`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: TARGET_URL, event_types: EVENTS }),
        });
        const created = await createRes.json().catch(() => null);
        steps.push({ action: "create", status: createRes.status, detail: createRes.ok ? null : created });
        if (createRes.ok) finalId = created.id;
      }

      out.repair = {
        target_url: TARGET_URL,
        steps,
        webhook_id: finalId,
        webhook_id_matches_secret: finalId === Deno.env.get("PAYPAL_WEBHOOK_ID"),
      };
    }

    // Ask PayPal to send genuinely signed test events to the registered URL.
    if (simulateEvents) {
      const selfUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/paypal-webhook`;
      out.simulations = [];
      for (const name of simulateEvents as string[]) {
        const r = await fetch(`${BASE}/v1/notifications/simulate-event`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: selfUrl, event_type: name }),
        });
        const b = await r.json().catch(() => null);
        out.simulations.push({ event_type: name, status: r.status, error: r.ok ? null : b });
      }
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
