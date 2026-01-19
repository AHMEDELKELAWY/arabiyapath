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
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - ArabiyaPath</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1a5f4a 0%, #2d8b6f 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">ArabiyaPath</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your Journey to Arabic Fluency</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 22px; font-weight: 600;">Hi ${displayName}! 👋</h2>
              <p style="margin: 0 0 24px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Welcome to ArabiyaPath! Please use the verification code below to confirm your email address:
              </p>
              
              <!-- Code Box -->
              <div style="background: linear-gradient(135deg, #f0f9f6 0%, #e8f5f1 100%); border: 2px solid #1a5f4a; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                <p style="margin: 0; color: #1a5f4a; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${verificationCode}</p>
              </div>
              
              <p style="margin: 0 0 8px; color: #888; font-size: 14px; text-align: center;">
                ⏰ This code expires in <strong>15 minutes</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              
              <p style="margin: 0; color: #888; font-size: 13px; text-align: center;">
                If you didn't create an account with ArabiyaPath, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                © ${new Date().getFullYear()} ArabiyaPath. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #aaa; font-size: 11px;">
                Learn Arabic dialects the natural way.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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
