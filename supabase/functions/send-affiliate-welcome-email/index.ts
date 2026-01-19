import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AffiliateWelcomeRequest {
  email: string;
  fullName: string;
  affiliateCode: string;
  commissionRate: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, affiliateCode, commissionRate }: AffiliateWelcomeRequest = await req.json();

    if (!email || !fullName || !affiliateCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending affiliate welcome email to ${email}`);

    // Get SMTP settings
    const smtpHost = Deno.env.get('ZOHO_SMTP_HOST')!;
    const smtpPort = parseInt(Deno.env.get('ZOHO_SMTP_PORT')!);
    const smtpUser = Deno.env.get('ZOHO_SMTP_USER')!;
    const smtpPass = Deno.env.get('ZOHO_SMTP_PASS')!;

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

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to ArabiyPath Partner Program</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2f6b58 0%,#3d8b70 100%);padding:32px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">
                <span style="color:#d4a853;">Arabiy</span>Path
              </div>
              <div style="margin-top:4px;font-size:13px;color:rgba(255,255,255,0.85);">
                Partner Program
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <div style="font-size:20px;font-weight:600;color:#1e293b;margin-bottom:8px;">
                🎉 Congratulations, ${fullName}!
              </div>
              <div style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;">
                Your application to join the ArabiyPath Partner Program has been <strong style="color:#16a34a;">approved</strong>! 
                You're now part of our affiliate family and can start earning commissions.
              </div>

              <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-radius:12px;padding:24px;margin-bottom:24px;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#166534;margin-bottom:12px;font-weight:600;">
                  YOUR AFFILIATE CODE
                </div>
                <div style="font-size:32px;font-weight:700;letter-spacing:3px;color:#15803d;text-align:center;background:#fff;padding:16px;border-radius:8px;border:2px dashed #86efac;">
                  ${affiliateCode}
                </div>
              </div>

              <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your Commission Rate</div>
                    <div style="font-size:28px;font-weight:700;color:#2f6b58;">${commissionRate}%</div>
                  </div>
                  <div style="font-size:40px;">💰</div>
                </div>
              </div>

              <div style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:24px;">
                <strong style="color:#1e293b;">How it works:</strong>
                <ul style="margin:12px 0;padding-left:20px;">
                  <li>Share your affiliate code with friends, family, and followers</li>
                  <li>When someone uses your code during checkout, they get a discount</li>
                  <li>You earn <strong>${commissionRate}%</strong> commission on every successful purchase</li>
                  <li>Track your earnings in your Affiliate Dashboard</li>
                </ul>
              </div>

              <a href="https://arabiyapath.lovable.app/affiliate" style="display:block;background:linear-gradient(135deg,#2f6b58 0%,#3d8b70 100%);color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:8px;font-weight:600;font-size:14px;">
                Go to Your Affiliate Dashboard →
              </a>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />

              <div style="font-size:13px;color:#64748b;text-align:center;">
                Have questions? Contact us at
                <a href="mailto:admin@arabiyapath.com" style="color:#2f6b58;text-decoration:none;font-weight:700;">admin@arabiyapath.com</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#fbfcfe;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} ArabiyPath Partner Program
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
        subject: `🎉 Welcome to ArabiyPath Partner Program - Your Code: ${affiliateCode}`,
        html: htmlContent,
      });
      console.log(`Affiliate welcome email sent successfully to ${email}`);
    } finally {
      await client.close();
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending affiliate welcome email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
