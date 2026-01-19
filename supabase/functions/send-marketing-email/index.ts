import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getMarketingEmailTemplate(subject: string, content: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject} - ArabiyaPath</title>
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
              <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 24px; text-align: center;">${subject}</h2>
              <div style="color: #475569; font-size: 16px; line-height: 1.8;">
                ${content}
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://arabiyapath.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                  ابدأ التعلم الآن
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px;">
                © 2024 ArabiyaPath. جميع الحقوق محفوظة.
              </p>
              <a href="${unsubscribeUrl}" style="color: #94a3b8; font-size: 12px;">
                إلغاء الاشتراك من القائمة البريدية
              </a>
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
    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { campaignId } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "Campaign ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get users with marketing consent and verified emails
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name")
      .eq("marketing_consent", true)
      .eq("email_verified", true)
      .not("email", "is", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible recipients found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Setup SMTP client
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

    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of users) {
      if (!recipient.email) continue;

      try {
        const unsubscribeUrl = `https://arabiyapath.lovable.app/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
        
        await client.send({
          from: smtpUser,
          to: recipient.email,
          subject: campaign.subject,
          html: getMarketingEmailTemplate(campaign.subject, campaign.content, unsubscribeUrl),
        });

        // Record the send
        await supabase.from("email_sends").insert({
          campaign_id: campaignId,
          user_id: recipient.user_id,
          status: "sent",
        });

        sentCount++;
        console.log(`Marketing email sent to ${recipient.email}`);
      } catch (emailError: any) {
        console.error(`Failed to send to ${recipient.email}:`, emailError);
        errors.push(`${recipient.email}: ${emailError.message}`);
      }
    }

    await client.close();

    // Update campaign with sent info
    await supabase
      .from("email_campaigns")
      .update({
        sent_at: new Date().toISOString(),
        recipients_count: sentCount,
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: users.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-marketing-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
