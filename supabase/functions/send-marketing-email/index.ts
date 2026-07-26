import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://arabiyapath.com';
const LOGIN_URL = `${SITE_URL}/login`;
const UNSUBSCRIBE_URL = `${SITE_URL}/unsubscribe`;
const REPLY_TO = 'admin@arabiyapath.com';

// ---- Zoho Mail sending profile -------------------------------------------
// Zoho throttles SMTP aggressively. Keep a conservative, sequential pace and
// recycle the connection so long runs don't hit "too many messages" errors.
const SEND_INTERVAL_MS = 1500;      // ~40 emails / minute
const RECONNECT_EVERY = 20;         // new SMTP session every N messages
const PAUSE_BETWEEN_BATCHES_MS = 3000;
const MAX_ATTEMPTS = 2;             // one retry per recipient on transient errors
const TIME_BUDGET_MS = 90_000;      // per invocation; then it resumes itself
const MAX_RECIPIENTS = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Audience = 'all_users' | 'never_purchased' | 'active_members' | 'expired_members' | 'manual';

interface Recipient {
  email: string;
  first_name: string | null;
  user_id: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fail = (message: string, status: number, extra: Record<string, unknown> = {}) =>
  json({ error: message, ...extra }, status);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function personalize(content: string, r: Recipient): string {
  return content
    .replace(/\{\{\s*first_name\s*\}\}/g, escapeHtml(r.first_name || 'there'))
    .replace(/\{\{\s*email\s*\}\}/g, escapeHtml(r.email))
    .replace(/\{\{\s*login_url\s*\}\}/g, LOGIN_URL)
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, `${UNSUBSCRIBE_URL}?email=${encodeURIComponent(r.email)}`);
}

/** Strips JavaScript and other active content while preserving layout HTML and inline CSS. */
function sanitizeHtmlEmail(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<object\b[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<base\b[^>]*\/?>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src|action)\s*=\s*"\s*(javascript|vbscript|data):[^"]*"/gi, '$1="#"')
    .replace(/(href|src|action)\s*=\s*'\s*(javascript|vbscript|data):[^']*'/gi, "$1='#'")
    .replace(/expression\s*\(/gi, '(');
}

function htmlToText(html: string): string {
  return html
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<head\b[\s\S]*?<\/head\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wrap(subject: string, body: string): string {
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8f9fa;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8f9fa;">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 40px 20px;text-align:center;background:linear-gradient(135deg,#1a5f4a 0%,#2d8b6f 100%);border-radius:16px 16px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">ArabiyaPath</h1>
        </td></tr>
        <tr><td style="padding:40px;color:#222;font-size:16px;line-height:1.6;">${body}</td></tr>
        <tr><td style="padding:24px 40px;background-color:#f8f9fa;border-radius:0 0 16px 16px;text-align:center;">
          <p style="margin:0 0 8px;color:#888;font-size:12px;">© ${new Date().getFullYear()} ArabiyaPath. All rights reserved.</p>
          <p style="margin:0;color:#888;font-size:12px;"><a href="${UNSUBSCRIBE_URL}" style="color:#888;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---- Environment ----------------------------------------------------------

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

function readSmtpConfig(): { config?: SmtpConfig; error?: string } {
  const host = Deno.env.get('ZOHO_SMTP_HOST');
  const portRaw = Deno.env.get('ZOHO_SMTP_PORT');
  const user = Deno.env.get('ZOHO_SMTP_USER');
  const pass = Deno.env.get('ZOHO_SMTP_PASS');

  const missing = [
    ['ZOHO_SMTP_HOST', host],
    ['ZOHO_SMTP_PORT', portRaw],
    ['ZOHO_SMTP_USER', user],
    ['ZOHO_SMTP_PASS', pass],
  ].filter(([, v]) => !v).map(([k]) => k as string);

  if (missing.length > 0) {
    return { error: `Zoho Mail is not configured. Missing secret(s): ${missing.join(', ')}.` };
  }
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return { error: `ZOHO_SMTP_PORT is not a valid port number (got "${portRaw}").` };
  }
  if (!EMAIL_RE.test(user!)) {
    return { error: `ZOHO_SMTP_USER must be the full mailbox address used to authenticate (got "${user}").` };
  }
  return { config: { host: host!, port, user: user!, pass: pass! } };
}

function newSmtpClient(cfg: SmtpConfig) {
  return new SMTPClient({
    connection: {
      hostname: cfg.host,
      port: cfg.port,
      tls: cfg.port === 465,
      auth: { username: cfg.user, password: cfg.pass },
    },
    pool: false,
  });
}

function smtpErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes('authentication') || lower.includes('535') || lower.includes('auth failed')) {
    return `Zoho SMTP authentication failed. Check ZOHO_SMTP_USER / ZOHO_SMTP_PASS (an app-specific password is required). Details: ${raw}`;
  }
  if (lower.includes('550') && lower.includes('relay')) {
    return `Zoho rejected the sender address. The From address must match ZOHO_SMTP_USER or a verified alias. Details: ${raw}`;
  }
  if (lower.includes('too many') || lower.includes('rate') || lower.includes('421') || lower.includes('quota')) {
    return `Zoho rate limit / sending quota reached. Details: ${raw}`;
  }
  if (lower.includes('connection') || lower.includes('dns') || lower.includes('timed out')) {
    return `Could not connect to the Zoho SMTP server (${Deno.env.get('ZOHO_SMTP_HOST')}:${Deno.env.get('ZOHO_SMTP_PORT')}). Details: ${raw}`;
  }
  return raw;
}

const isTransient = (err: unknown) => {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return m.includes('timeout') || m.includes('timed out') || m.includes('connection') ||
    m.includes('421') || m.includes('450') || m.includes('451') || m.includes('closed');
};

// ---- Recipients -----------------------------------------------------------

async function resolveRecipients(
  supabase: any,
  audience: Audience,
  excludePurchasers: boolean,
  manualEmails: string[],
): Promise<{ recipients: Recipient[]; skipped: number }> {
  let list: Recipient[] = [];

  if (audience === 'manual') {
    list = manualEmails.map((raw) => ({
      email: String(raw || '').trim().toLowerCase(),
      first_name: null,
      user_id: null,
    }));
  } else {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, email, first_name')
      .not('email', 'is', null);
    if (error) throw new Error(`Could not load recipients: ${error.message}`);

    list = (profiles ?? [])
      .filter((p: any) => p.email)
      .map((p: any) => ({ email: String(p.email).trim().toLowerCase(), first_name: p.first_name, user_id: p.user_id }));

    const { data: purchases, error: purchaseErr } = await supabase
      .from('purchases')
      .select('user_id')
      .in('status', ['active', 'completed']);
    if (purchaseErr) throw new Error(`Could not load purchases: ${purchaseErr.message}`);
    const purchaserIds = new Set<string>((purchases ?? []).map((p: any) => p.user_id));

    const { data: subs, error: subErr } = await supabase
      .from('membership_subscriptions')
      .select('user_id, status, expires_at');
    if (subErr) throw new Error(`Could not load memberships: ${subErr.message}`);

    const now = Date.now();
    const activeIds = new Set<string>();
    const anySubIds = new Set<string>();
    for (const s of subs ?? []) {
      anySubIds.add(s.user_id);
      const isActive =
        s.status === 'ACTIVE' ||
        (s.status === 'CANCELLED' && s.expires_at && new Date(s.expires_at).getTime() > now);
      if (isActive) activeIds.add(s.user_id);
    }

    if (audience === 'never_purchased') {
      list = list.filter((r) => r.user_id && !purchaserIds.has(r.user_id));
    } else if (audience === 'active_members') {
      list = list.filter((r) => r.user_id && activeIds.has(r.user_id));
    } else if (audience === 'expired_members') {
      list = list.filter((r) => r.user_id && anySubIds.has(r.user_id) && !activeIds.has(r.user_id));
    } else if (audience === 'all_users' && excludePurchasers) {
      list = list.filter((r) => r.user_id && !purchaserIds.has(r.user_id));
    }
  }

  // Suppression list (bounces, complaints, unsubscribes)
  let suppressed = new Set<string>();
  try {
    const { data: sup } = await supabase.from('suppressed_emails').select('email');
    suppressed = new Set<string>((sup ?? []).map((s: any) => String(s.email).trim().toLowerCase()));
  } catch (_) { /* suppression table optional */ }

  const seen = new Set<string>();
  const out: Recipient[] = [];
  let skipped = 0;
  for (const r of list) {
    if (!EMAIL_RE.test(r.email)) { skipped++; continue; }
    if (suppressed.has(r.email)) { skipped++; continue; }
    if (seen.has(r.email)) { skipped++; continue; }
    seen.add(r.email);
    out.push(r);
  }

  // Deterministic order so a resumed run continues exactly where it stopped.
  out.sort((a, b) => (a.email < b.email ? -1 : a.email > b.email ? 1 : 0));
  return { recipients: out.slice(0, MAX_RECIPIENTS), skipped };
}

// ---- Campaign processing --------------------------------------------------

interface CampaignJob {
  campaignId: string;
  subject: string;
  content: string;
  contentMode: 'visual' | 'html';
  audience: Audience;
  excludePurchasers: boolean;
  manualEmails: string[];
  offset: number;
}

function buildHtml(job: { subject: string; content: string; contentMode: 'visual' | 'html' }, r: Recipient) {
  return job.contentMode === 'html'
    ? personalize(sanitizeHtmlEmail(job.content), r)
    : wrap(job.subject, personalize(job.content, r));
}

async function runCampaign(supabase: any, cfg: SmtpConfig, job: CampaignJob) {
  const started = Date.now();
  const { recipients } = await resolveRecipients(supabase, job.audience, job.excludePurchasers, job.manualEmails);
  const slice = recipients.slice(job.offset);

  let client = newSmtpClient(cfg);
  let sinceReconnect = 0;
  let sent = 0;
  const failed: { email: string; user_id: string | null; error: string }[] = [];
  const sendRows: any[] = [];
  let processed = 0;

  for (const r of slice) {
    if (Date.now() - started > TIME_BUDGET_MS) break;

    if (sinceReconnect >= RECONNECT_EVERY) {
      try { await client.close(); } catch (_) { /* ignore */ }
      await sleep(PAUSE_BETWEEN_BATCHES_MS);
      client = newSmtpClient(cfg);
      sinceReconnect = 0;
    }

    let lastError: unknown = null;
    let ok = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !ok; attempt++) {
      try {
        const html = buildHtml(job, r);
        await client.send({
          from: `ArabiyaPath <${cfg.user}>`,
          to: r.email,
          replyTo: REPLY_TO,
          subject: personalize(job.subject, r),
          html,
          content: htmlToText(html),
          headers: {
            'List-Unsubscribe': `<${UNSUBSCRIBE_URL}?email=${encodeURIComponent(r.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        } as any);
        ok = true;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_ATTEMPTS && isTransient(err)) {
          try { await client.close(); } catch (_) { /* ignore */ }
          await sleep(2000);
          client = newSmtpClient(cfg);
          sinceReconnect = 0;
        } else {
          break;
        }
      }
    }

    processed++;
    sinceReconnect++;
    if (ok) {
      sent++;
      sendRows.push({ campaign_id: job.campaignId, user_id: r.user_id, email: r.email, status: 'sent' });
    } else {
      const msg = smtpErrorMessage(lastError);
      console.error(`send-marketing-email: failed for ${r.email}: ${msg}`);
      failed.push({ email: r.email, user_id: r.user_id, error: msg });
      sendRows.push({ campaign_id: job.campaignId, user_id: r.user_id, email: r.email, status: 'failed', error_message: msg.slice(0, 500) });
    }

    await sleep(SEND_INTERVAL_MS);
  }

  try { await client.close(); } catch (_) { /* ignore */ }

  if (sendRows.length > 0) {
    const { error: logErr } = await supabase.from('email_sends').insert(sendRows);
    if (logErr) console.error('send-marketing-email: email_sends insert failed', logErr.message);
  }

  // Merge counters with whatever previous chunks recorded.
  const { data: current } = await supabase
    .from('email_campaigns')
    .select('sent_success, sent_failed, failed_emails, recipients_count')
    .eq('id', job.campaignId)
    .maybeSingle();

  const totalSent = (current?.sent_success ?? 0) + sent;
  const totalFailed = (current?.sent_failed ?? 0) + failed.length;
  const failedEmails = [...(current?.failed_emails ?? []), ...failed.map((f) => f.email)];
  const nextOffset = job.offset + processed;
  const done = nextOffset >= recipients.length;

  await supabase
    .from('email_campaigns')
    .update({
      sent_success: totalSent,
      sent_failed: totalFailed,
      failed_emails: failedEmails,
      status: done
        ? (totalSent === 0 ? 'failed' : totalFailed > 0 ? 'partial' : 'sent')
        : 'sending',
      error_message: done && totalSent === 0 && failed.length > 0 ? failed[0].error.slice(0, 500) : null,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', job.campaignId);

  if (!done) {
    // Continue in a fresh invocation so long campaigns never hit CPU/wall limits.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-marketing-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ mode: 'resume', job: { ...job, offset: nextOffset } }),
      });
    } catch (e) {
      console.error('send-marketing-email: resume dispatch failed', e);
      await supabase
        .from('email_campaigns')
        .update({ status: 'partial', error_message: 'Campaign stopped early: could not resume processing.', completed_at: new Date().toISOString() })
        .eq('id', job.campaignId);
    }
  }
}

// ---- HTTP handler ---------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return fail('Backend is misconfigured: Supabase environment variables are missing.', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({} as any));
    const mode: 'count' | 'test' | 'send' | 'resume' = body.mode ?? 'send';

    const authHeader = req.headers.get('authorization') ?? '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');

    // Internal continuation call — authenticated with the service role key.
    if (mode === 'resume') {
      if (bearer !== supabaseServiceKey) {
        return fail('Not authorized to resume a campaign.', 403);
      }
      const { config, error: cfgErr } = readSmtpConfig();
      if (!config) return fail(cfgErr!, 500);
      const job = body.job as CampaignJob;
      if (!job?.campaignId) return fail('Resume payload is missing the campaign id.', 400);
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil(runCampaign(supabase, config, job).catch(async (e) => {
        console.error('resume failed', e);
        await supabase.from('email_campaigns')
          .update({ status: 'partial', error_message: String(e?.message ?? e).slice(0, 500), completed_at: new Date().toISOString() })
          .eq('id', job.campaignId);
      }));
      return json({ accepted: true });
    }

    if (!authHeader) {
      return fail('You must be signed in to use email campaigns.', 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return fail('Your session has expired. Please sign in again.', 401);
    }

    const { data: roleData, error: roleErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleErr) return fail(`Could not verify your permissions: ${roleErr.message}`, 500);
    if (!roleData) return fail('Admin access is required to send campaigns.', 403);

    const subject: string = String(body.subject ?? '').trim();
    const content: string = String(body.content ?? '');
    const audience: Audience = (body.audience ?? 'all_users') as Audience;
    const excludePurchasers = Boolean(body.excludePurchasers);
    const contentMode: 'visual' | 'html' = body.contentMode === 'html' ? 'html' : 'visual';
    const manualEmails: string[] = Array.isArray(body.manualEmails) ? body.manualEmails : [];

    const validAudiences: Audience[] = ['all_users', 'never_purchased', 'active_members', 'expired_members', 'manual'];
    if (!validAudiences.includes(audience)) {
      return fail(`Unknown audience "${audience}".`, 400);
    }

    if (mode !== 'count') {
      if (!subject) return fail('A subject line is required.', 400);
      if (subject.length > 250) return fail('The subject line is too long (max 250 characters).', 400);
      if (!content.trim()) return fail('The message body is required.', 400);
      if (content.length > 400_000) return fail('The message is too large to send (max ~400 KB of HTML).', 400);
    }

    // ---- count ----
    if (mode === 'count') {
      const { recipients, skipped } = await resolveRecipients(supabase, audience, excludePurchasers, manualEmails);
      return json({ count: recipients.length, skipped });
    }

    const { config, error: cfgErr } = readSmtpConfig();
    if (!config) return fail(cfgErr!, 500);

    // ---- test ----
    if (mode === 'test') {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('user_id', user.id)
        .maybeSingle();
      const email = (prof?.email || user.email || '').trim().toLowerCase();
      if (!email) return fail('No email address is set on your admin account, so the test cannot be sent.', 400);

      const r: Recipient = { email, first_name: prof?.first_name ?? null, user_id: user.id };
      const client = newSmtpClient(config);
      try {
        const html = buildHtml({ subject, content, contentMode }, r);
        await client.send({
          from: `ArabiyaPath <${config.user}>`,
          to: email,
          replyTo: REPLY_TO,
          subject: `[TEST] ${personalize(subject, r)}`,
          html,
          content: htmlToText(html),
        } as any);
        return json({ success: true, total: 1, sent: 1, failed: 0, failedEmails: [], recipient: email });
      } catch (err) {
        const message = smtpErrorMessage(err);
        console.error('send-marketing-email: test send failed', message);
        return fail(message, 502);
      } finally {
        try { await client.close(); } catch (_) { /* ignore */ }
      }
    }

    // ---- send ----
    const { recipients, skipped } = await resolveRecipients(supabase, audience, excludePurchasers, manualEmails);
    if (recipients.length === 0) {
      return fail(
        audience === 'manual'
          ? 'No valid email addresses were found in the manual list.'
          : 'This audience currently has no valid, non-suppressed recipients.',
        400,
      );
    }

    const { data: campaign, error: campaignErr } = await supabase
      .from('email_campaigns')
      .insert({
        subject,
        content,
        content_mode: contentMode,
        audience,
        exclude_purchasers: audience === 'all_users' ? excludePurchasers : false,
        manual_emails: audience === 'manual' ? recipients.map((r) => r.email) : [],
        recipients_count: recipients.length,
        skipped_count: skipped,
        sent_success: 0,
        sent_failed: 0,
        failed_emails: [],
        sent_by: user.id,
        sent_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        status: 'sending',
      })
      .select('id')
      .single();

    if (campaignErr || !campaign) {
      return fail(`Could not create the campaign record: ${campaignErr?.message ?? 'unknown error'}`, 500);
    }

    const job: CampaignJob = {
      campaignId: campaign.id,
      subject, content, contentMode, audience, excludePurchasers, manualEmails,
      offset: 0,
    };

    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(runCampaign(supabase, config, job).catch(async (e) => {
      console.error('send-marketing-email: campaign failed', e);
      await supabase.from('email_campaigns')
        .update({ status: 'failed', error_message: String(e?.message ?? e).slice(0, 500), completed_at: new Date().toISOString() })
        .eq('id', campaign.id);
    }));

    return json({
      success: true,
      queued: true,
      campaignId: campaign.id,
      total: recipients.length,
      skipped,
    }, 202);
  } catch (error: unknown) {
    console.error('send-marketing-email: unhandled error', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error while sending emails.';
    return fail(message, 500);
  }
});
