// Records Zoho bounce / complaint (spam) / unsubscribe events.
//
// Auth: shared secret. Zoho must call this URL with either
//   ?secret=<ZOHO_WEBHOOK_SECRET>   or   header  X-Webhook-Secret: <ZOHO_WEBHOOK_SECRET>
//
// Accepted payloads (Zoho Campaigns / Zoho Mail notifications vary a lot, so the
// parser is deliberately permissive):
//   { "email": "a@b.com", "event": "bounce", "reason": "550 ..." }
//   { "events": [ { "emailaddress": "...", "eventtype": "spam" }, ... ] }
//   [ { "to": "...", "type": "unsubscribe" } ]
// Form-encoded bodies with the same keys also work.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type EventKind = 'bounced' | 'complained' | 'unsubscribed';

interface ParsedEvent {
  email: string;
  kind: EventKind;
  detail: string | null;
  raw: Record<string, unknown>;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function classify(rawType: string): EventKind | null {
  const t = rawType.toLowerCase();
  if (!t) return null;
  if (t.includes('spam') || t.includes('complain') || t.includes('abuse')) return 'complained';
  if (t.includes('unsub') || t.includes('optout') || t.includes('opt_out')) return 'unsubscribed';
  if (t.includes('bounce') || t.includes('reject') || t.includes('undeliver') || t.includes('invalid') || t.includes('dropped')) return 'bounced';
  return null;
}

const pick = (o: Record<string, any>, keys: string[]): string => {
  for (const k of Object.keys(o)) {
    if (keys.includes(k.toLowerCase().replace(/[\s_-]/g, ''))) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number') return String(v);
    }
  }
  return '';
};

function parseEvents(payload: unknown): { events: ParsedEvent[]; ignored: number } {
  const candidates: Record<string, any>[] = [];

  const collect = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(collect); return; }
    if (typeof node !== 'object') return;
    const nested = node.events ?? node.data ?? node.records ?? node.items ?? node.bounces;
    if (Array.isArray(nested)) { nested.forEach(collect); return; }
    candidates.push(node);
  };
  collect(payload);

  const events: ParsedEvent[] = [];
  let ignored = 0;

  for (const c of candidates) {
    const email = pick(c, ['email', 'emailaddress', 'recipient', 'recipientemail', 'to', 'contactemail', 'subscriberemail'])
      .toLowerCase();
    const typeRaw = pick(c, ['event', 'eventtype', 'type', 'status', 'action', 'reasoncode', 'bouncetype']);
    const kind = classify(typeRaw);
    const detail = pick(c, ['reason', 'description', 'message', 'diagnosticcode', 'details', 'bouncereason', 'smtpreply']) || null;

    if (!EMAIL_RE.test(email) || !kind) { ignored++; continue; }
    events.push({ email, kind, detail, raw: c });
  }

  return { events, ignored };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const secret = Deno.env.get('ZOHO_WEBHOOK_SECRET');
  if (!secret) {
    console.error('zoho-email-webhook: ZOHO_WEBHOOK_SECRET is not configured');
    return json({ error: 'Webhook is not configured yet: the ZOHO_WEBHOOK_SECRET is missing.' }, 503);
  }

  const url = new URL(req.url);
  const provided = req.headers.get('x-webhook-secret') ?? url.searchParams.get('secret') ?? '';
  if (!timingSafeEqual(provided, secret)) {
    return json({ error: 'Invalid webhook secret.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Backend is misconfigured.' }, 500);
  const supabase = createClient(supabaseUrl, serviceKey);

  // ---- payload -------------------------------------------------------------
  let payload: unknown;
  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = Object.fromEntries(new URLSearchParams(text));
      }
    }
  } catch (e) {
    return json({ error: `Could not read the webhook body: ${e instanceof Error ? e.message : String(e)}` }, 400);
  }

  const { events, ignored } = parseEvents(payload);
  if (events.length === 0) {
    console.warn('zoho-email-webhook: no recognizable events', JSON.stringify(payload).slice(0, 800));
    return json({ received: 0, ignored, message: 'No recognizable bounce/complaint/unsubscribe events in payload.' }, 202);
  }

  const results: { email: string; kind: EventKind; campaign_id: string | null; suppressed: boolean }[] = [];

  for (const ev of events) {
    try {
      // Attach the event to the most recent campaign send for this address.
      const { data: lastSend } = await supabase
        .from('email_sends')
        .select('id, campaign_id')
        .eq('email', ev.email)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastSend?.id) {
        await supabase
          .from('email_sends')
          .update({
            status: ev.kind,
            event_at: new Date().toISOString(),
            event_detail: ev.detail ? ev.detail.slice(0, 500) : null,
          })
          .eq('id', lastSend.id);
      }

      // Suppress the address (skip if already suppressed for the same reason).
      const { data: existing } = await supabase
        .from('suppressed_emails')
        .select('id')
        .eq('email', ev.email)
        .eq('reason', ev.kind)
        .maybeSingle();

      let suppressed = false;
      if (!existing) {
        const { error: supErr } = await supabase.from('suppressed_emails').insert({
          email: ev.email,
          reason: ev.kind,
          source: 'zoho',
          campaign_id: lastSend?.campaign_id ?? null,
          metadata: { provider: 'zoho', detail: ev.detail, payload: ev.raw },
        });
        if (supErr) console.error('zoho-email-webhook: suppression insert failed', supErr.message);
        else suppressed = true;
      }

      results.push({ email: ev.email, kind: ev.kind, campaign_id: lastSend?.campaign_id ?? null, suppressed });
    } catch (e) {
      console.error(`zoho-email-webhook: failed to record event for ${ev.email}`, e);
    }
  }

  console.log(`zoho-email-webhook: recorded ${results.length} event(s), ignored ${ignored}`);
  return json({ received: results.length, ignored, results });
});
