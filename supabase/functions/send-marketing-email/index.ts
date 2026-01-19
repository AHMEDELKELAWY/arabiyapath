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
    // Verify admin authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify the user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { campaignId } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'Campaign ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get users with marketing consent and verified email
    const { data: subscribers, error: subscribersError } = await supabase
      .from('profiles')
      .select('user_id, email, first_name')
      .eq('marketing_consent', true)
      .eq('email_verified', true)
      .not('email', 'is', null);

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscribers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscribers found', sentCount: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize SMTP client
    const smtpHost = Deno.env.get('ZOHO_SMTP_HOST')!;
    const smtpPort = parseInt(Deno.env.get('ZOHO_SMTP_PORT')!);
    const smtpUser = Deno.env.get('ZOHO_SMTP_USER')!;
    const smtpPass = Deno.env.get('ZOHO_SMTP_PASS')!;

    // Port 465 uses direct TLS, port 587 uses STARTTLS
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

    let sentCount = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      try {
        // Personalize content
        const personalizedContent = campaign.content
          .replace(/\{\{first_name\}\}/g, subscriber.first_name || 'there')
          .replace(/\{\{email\}\}/g, subscriber.email);

        const htmlContent = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${campaign.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 20px; text-align: center; background: linear-gradient(135deg, #1a5f4a 0%, #2d8b6f 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">ArabiyaPath</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${personalizedContent}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 8px; color: #888; font-size: 12px;">
                You received this email because you subscribed to ArabiyaPath updates.
              </p>
              <p style="margin: 0; color: #888; font-size: 12px;">
                © ${new Date().getFullYear()} ArabiyaPath. All rights reserved.
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

        await client.send({
          from: `ArabiyaPath <${smtpUser}>`,
          to: subscriber.email,
          subject: campaign.subject,
          html: htmlContent,
        });

        // Record send
        await supabase
          .from('email_sends')
          .insert({
            campaign_id: campaignId,
            user_id: subscriber.user_id,
            status: 'sent',
          });

        sentCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        errors.push(subscriber.email);
      }
    }

    await client.close();

    // Update campaign with sent info
    await supabase
      .from('email_campaigns')
      .update({
        sent_at: new Date().toISOString(),
        recipients_count: sentCount,
      })
      .eq('id', campaignId);

    console.log(`Marketing campaign sent: ${sentCount} emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent to ${sentCount} subscribers`,
        sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending marketing email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send marketing emails';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
