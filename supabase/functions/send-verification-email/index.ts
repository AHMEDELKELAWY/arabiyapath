import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save verification code to profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt.toISOString(),
      })
      .eq('email', email);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Zoho SMTP
    const smtpHost = Deno.env.get('ZOHO_SMTP_HOST')!;
    const smtpPort = parseInt(Deno.env.get('ZOHO_SMTP_PORT')!);
    const smtpUser = Deno.env.get('ZOHO_SMTP_USER')!;
    const smtpPass = Deno.env.get('ZOHO_SMTP_PASS')!;

    // Port 465 uses direct TLS, port 587 uses STARTTLS (tls: false in denomailer)
    const useTls = smtpPort === 465;
    console.log(`Connecting to SMTP: ${smtpHost}:${smtpPort} (TLS: ${useTls})`);

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: useTls,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    const displayName = firstName || 'there';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2f6b58 0%,#3d8b70 100%);padding:32px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">
                <span style="color:#d4a853;">Arabiy</span>Path
              </div>
              <div style="margin-top:4px;font-size:13px;color:rgba(255,255,255,0.85);">
                Your Journey to Arabic Fluency
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <div style="font-size:18px;font-weight:600;color:#1e293b;margin-bottom:8px;">
                Hi ${displayName} 👋
              </div>
              <div style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;">
                Welcome to ArabiyPath! Please use the verification code below to confirm your email:
              </div>

              <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:8px;">
                  YOUR VERIFICATION CODE
                </div>
                <div style="font-size:36px;font-weight:700;letter-spacing:6px;color:#2f6b58;">
                  ${verificationCode}
                </div>
              </div>

              <div style="font-size:13px;color:#94a3b8;text-align:center;margin-bottom:24px;">
                This code expires in 15 minutes. If you didn't request this, ignore this email.
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />

              <div style="font-size:13px;color:#64748b;text-align:center;">
                Need help? Contact
                <a href="mailto:admin@arabiyapath.com" style="color:#2f6b58;text-decoration:none;font-weight:700;">admin@arabiyapath.com</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fbfcfe;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} ArabiyPath
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
    `;

    try {
      await client.send({
        from: `ArabiyaPath <${smtpUser}>`,
        to: email,
        subject: `${verificationCode} - Your ArabiyaPath Verification Code`,
        html: htmlContent,
      });
      console.log(`Verification email sent successfully to ${email}`);
    } finally {
      await client.close();
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Verification email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending verification email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send verification email';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
