import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://arabiyapath.com';
const LOGIN_URL = `${SITE_URL}/login`;

type Audience =
  | 'all_users'
  | 'never_purchased'
  | 'active_members'
  | 'expired_members'
  | 'manual';

interface Recipient {
  email: string;
  first_name: string | null;
  user_id: string | null;
}

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
    .replace(/\{\{\s*login_url\s*\}\}/g, LOGIN_URL);
}

// Strips JavaScript vectors while preserving layout HTML and inline CSS.
function sanitizeHtmlEmail(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<object\b[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src|action)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src|action)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
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
          <p style="margin:0;color:#888;font-size:12px;">© ${new Date().getFullYear()} ArabiyaPath. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function resolveRecipients(
  supabase: any,
  audience: Audience,
  excludePurchasers: boolean,
  manualEmails: string[],
): Promise<Recipient[]> {
  if (audience === 'manual') {
    const seen = new Set<string>();
    const out: Recipient[] = [];
    for (const raw of manualEmails) {
      const email = String(raw || '').trim().toLowerCase();
      if (!email || !email.includes('@') || seen.has(email)) continue;
      seen.add(email);
      out.push({ email, first_name: null, user_id: null });
    }
    return out;
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, email, first_name')
    .not('email', 'is', null);
  if (error) throw error;

  let list: Recipient[] = (profiles ?? [])
    .filter((p: any) => p.email)
    .map((p: any) => ({ email: p.email, first_name: p.first_name, user_id: p.user_id }));

  // Purchasers
  const { data: purchases } = await supabase
    .from('purchases')
    .select('user_id')
    .in('status', ['active', 'completed']);
  const purchaserIds = new Set<string>((purchases ?? []).map((p: any) => p.user_id));

  // Memberships
  const { data: subs } = await supabase
    .from('membership_subscriptions')
    .select('user_id, status, expires_at');
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

  // De-dupe by email
  const seen = new Set<string>();
  return list.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: 'count' | 'test' | 'send' = body.mode ?? 'send';
    const subject: string = String(body.subject ?? '').trim();
    const content: string = String(body.content ?? '');
    const audience: Audience = (body.audience ?? 'all_users') as Audience;
    const excludePurchasers = Boolean(body.excludePurchasers);
    const manualEmails: string[] = Array.isArray(body.manualEmails) ? body.manualEmails : [];

    if (mode !== 'count' && (!subject || !content.trim())) {
      return new Response(JSON.stringify({ error: 'Subject and message are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recipients: Recipient[] = [];
    if (mode === 'test') {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('user_id', user.id)
        .maybeSingle();
      const email = prof?.email || user.email;
      if (!email) {
        return new Response(JSON.stringify({ error: 'No admin email found' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipients = [{ email, first_name: prof?.first_name ?? null, user_id: user.id }];
    } else {
      recipients = await resolveRecipients(supabase, audience, excludePurchasers, manualEmails);
    }

    if (mode === 'count') {
      return new Response(JSON.stringify({ count: recipients.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ total: 0, sent: 0, failed: 0, failedEmails: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const smtpHost = Deno.env.get('ZOHO_SMTP_HOST')!;
    const smtpPort = parseInt(Deno.env.get('ZOHO_SMTP_PORT')!);
    const smtpUser = Deno.env.get('ZOHO_SMTP_USER')!;
    const smtpPass = Deno.env.get('ZOHO_SMTP_PASS')!;

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: { username: smtpUser, password: smtpPass },
      },
    });

    let sentCount = 0;
    const failedEmails: string[] = [];

    for (const r of recipients) {
      try {
        const html = wrap(subject, personalize(content, r));
        await client.send({
          from: `ArabiyaPath <${smtpUser}>`,
          to: r.email,
          replyTo: 'admin@arabiyapath.com',
          subject: personalize(subject, r),
          html,
        });
        sentCount++;
        await new Promise((res) => setTimeout(res, 100));
      } catch (err) {
        console.error(`Failed to send to ${r.email}:`, err);
        failedEmails.push(r.email);
      }
    }

    try { await client.close(); } catch (_) { /* ignore */ }

    let campaignId: string | null = null;
    if (mode === 'send') {
      const { data: campaign } = await supabase
        .from('email_campaigns')
        .insert({
          subject,
          content,
          audience,
          exclude_purchasers: audience === 'all_users' ? excludePurchasers : false,
          manual_emails: audience === 'manual' ? recipients.map((r) => r.email) : [],
          recipients_count: recipients.length,
          sent_success: sentCount,
          sent_failed: failedEmails.length,
          failed_emails: failedEmails,
          sent_by: user.id,
          sent_at: new Date().toISOString(),
          status: sentCount === 0 ? 'failed' : (failedEmails.length > 0 ? 'partial' : 'sent'),
        })
        .select('id')
        .single();
      campaignId = campaign?.id ?? null;

      if (campaignId) {
        const rows = recipients
          .filter((r) => r.user_id)
          .map((r) => ({
            campaign_id: campaignId,
            user_id: r.user_id as string,
            status: failedEmails.includes(r.email) ? 'failed' : 'sent',
          }));
        if (rows.length > 0) {
          await supabase.from('email_sends').insert(rows);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignId,
        total: recipients.length,
        sent: sentCount,
        failed: failedEmails.length,
        failedEmails,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('Error sending marketing email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send emails';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
