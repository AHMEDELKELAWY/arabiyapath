import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get PayPal API base URL (sandbox vs live)
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_SECRET")!;
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

async function verifyWebhookSignature(
  req: Request,
  body: any,
  rawBody: string
): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID not configured - rejecting webhook");
    return false;
  }
  
  // Extract PayPal signature headers
  const transmissionId = req.headers.get("PAYPAL-TRANSMISSION-ID");
  const transmissionTime = req.headers.get("PAYPAL-TRANSMISSION-TIME");
  const certUrl = req.headers.get("PAYPAL-CERT-URL");
  const authAlgo = req.headers.get("PAYPAL-AUTH-ALGO");
  const transmissionSig = req.headers.get("PAYPAL-TRANSMISSION-SIG");
  
  // Check if all required headers are present
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error("Missing PayPal signature headers");
    return false;
  }
  
  try {
    const accessToken = await getPayPalAccessToken();
    
    const verifyResponse = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: webhookId,
          webhook_event: body,
        }),
      }
    );
    
    if (!verifyResponse.ok) {
      console.error("PayPal verification API error:", verifyResponse.status);
      return false;
    }
    
    const verification = await verifyResponse.json();
    console.log("Webhook verification result:", verification.verification_status);
    
    return verification.verification_status === "SUCCESS";
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    console.log("PayPal webhook received:", body.event_type);
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, body, rawBody);
    
    if (!isValid) {
      console.error("Invalid webhook signature - rejecting request");
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Webhook signature verified successfully");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle different event types
    switch (body.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureId = body.resource.id;
        const orderId = body.resource.supplementary_data?.related_ids?.order_id;

        console.log("Payment captured:", captureId, "Order:", orderId);

        // Verify the payment exists in our records
        const { data: purchase, error } = await supabase
          .from("purchases")
          .select("*")
          .eq("paypal_capture_id", captureId)
          .single();

        if (error || !purchase) {
          console.log("Purchase not found for capture:", captureId);
          // The payment was already processed via the capture endpoint
          break;
        }

        // Update status if needed
        if (purchase.status !== "completed") {
          await supabase
            .from("purchases")
            .update({ status: "completed" })
            .eq("id", purchase.id);
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        const captureId = body.resource.id;
        
        // Update purchase status
        await supabase
          .from("purchases")
          .update({ 
            status: body.event_type === "PAYMENT.CAPTURE.REFUNDED" ? "refunded" : "failed" 
          })
          .eq("paypal_capture_id", captureId);
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
