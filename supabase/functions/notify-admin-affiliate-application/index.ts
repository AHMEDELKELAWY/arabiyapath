import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Payload {
  applicationId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body?.applicationId) {
      return new Response(JSON.stringify({ error: "applicationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: app, error: appErr } = await admin
      .from("affiliate_applications")
      .select("id, user_id, full_name, phone, how_will_promote, created_at")
      .eq("id", body.applicationId)
      .maybeSingle();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the owner of the application can trigger the notification
    if (app.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("user_id", app.user_id)
      .maybeSingle();

    const smtpHost = Deno.env.get("ZOHO_SMTP_HOST")!;
    const smtpPort = parseInt(Deno.env.get("ZOHO_SMTP_PORT")!);
    const smtpUser = Deno.env.get("ZOHO_SMTP_USER")!;
    const smtpPass = Deno.env.get("ZOHO_SMTP_PASS")!;
    const adminEmail = "admin@arabiyapath.com";

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: { username: smtpUser, password: smtpPass },
      },
    });

    const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#2f6b58 0%,#3d8b70 100%);padding:24px;color:#fff;">
          <div style="font-size:20px;font-weight:700;">New Affiliate Application</div>
          <div style="font-size:13px;opacity:.85;margin-top:4px;">ArabiyaPath Partner Program</div>
        </td></tr>
        <tr><td style="padding:24px;color:#1e293b;font-size:14px;line-height:1.6;">
          <table cellspacing="0" cellpadding="8" width="100%" style="border-collapse:collapse;">
            <tr><td style="color:#64748b;width:140px;">Name</td><td><strong>${escapeHtml(app.full_name)}</strong></td></tr>
            <tr><td style="color:#64748b;">Email</td><td>${escapeHtml(profile?.email ?? "—")}</td></tr>
            <tr><td style="color:#64748b;">Phone</td><td>${escapeHtml(app.phone ?? "—")}</td></tr>
            <tr><td style="color:#64748b;vertical-align:top;">How they'll promote</td><td style="white-space:pre-wrap;">${escapeHtml(app.how_will_promote)}</td></tr>
            <tr><td style="color:#64748b;">Submitted</td><td>${escapeHtml(new Date(app.created_at).toUTCString())}</td></tr>
          </table>
          <div style="margin-top:24px;">
            <a href="https://arabiyapath.com/admin/affiliate-applications" style="display:inline-block;background:#2f6b58;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
              Review application →
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    try {
      await client.send({
        from: `ArabiyaPath <${smtpUser}>`,
        to: adminEmail,
        subject: `New affiliate application: ${app.full_name.replace(/[\r\n]/g, "")}`,
        html,
      });
    } finally {
      await client.close();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-admin-affiliate-application error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
