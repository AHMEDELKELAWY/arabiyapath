import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEmailTemplate(code: string, firstName: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تأكيد البريد الإلكتروني - ArabiyaPath</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 16px 16px 0 0;">
              <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: #ffffff; font-size: 36px; font-weight: bold;">ع</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">ArabiyaPath</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 16px; text-align: center;">مرحباً ${firstName || 'بك'}! 👋</h2>
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                شكراً لتسجيلك في ArabiyaPath. لتفعيل حسابك، يرجى إدخال كود التأكيد التالي:
              </p>
              
              <!-- Verification Code -->
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 32px; text-align: center; margin: 0 0 24px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 12px;">كود التأكيد</p>
                <div style="font-size: 36px; font-weight: bold; color: #0ea5e9; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${code}
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">صالح لمدة 15 دقيقة</p>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © 2024 ArabiyaPath. جميع الحقوق محفوظة.
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId, firstName } = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: "Email and userId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Save code to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt,
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Zoho SMTP
    const smtpHost = Deno.env.get("ZOHO_SMTP_HOST") || "smtp.zoho.com";
    const smtpPort = parseInt(Deno.env.get("ZOHO_SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("ZOHO_SMTP_USER")!;
    const smtpPass = Deno.env.get("ZOHO_SMTP_PASS")!;

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: smtpUser,
      to: email,
      subject: `كود التأكيد الخاص بك: ${verificationCode} - ArabiyaPath`,
      html: getEmailTemplate(verificationCode, firstName || ""),
    });

    await client.close();

    console.log(`Verification email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
