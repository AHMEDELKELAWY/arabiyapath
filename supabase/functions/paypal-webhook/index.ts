import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com";

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
  
  const transmissionId = req.headers.get("PAYPAL-TRANSMISSION-ID");
  const transmissionTime = req.headers.get("PAYPAL-TRANSMISSION-TIME");
  const certUrl = req.headers.get("PAYPAL-CERT-URL");
  const authAlgo = req.headers.get("PAYPAL-AUTH-ALGO");
  const transmissionSig = req.headers.get("PAYPAL-TRANSMISSION-SIG");
  
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

/**
 * Backup path: create a purchase from pending_order if the client-side capture flow failed.
 */
async function ensurePurchaseExists(
  supabase: any,
  paypalOrderId: string,
  captureId: string,
  captureAmount: number,
  captureCurrency: string,
  pendingOrderId: string
) {
  // Check if purchase already exists
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("paypal_order_id", paypalOrderId)
    .maybeSingle();

  if (existing) {
    // Just ensure status is correct
    await supabase
      .from("purchases")
      .update({ status: "active", paypal_capture_id: captureId })
      .eq("id", existing.id);
    console.log(`Webhook: purchase already exists (${existing.id}), updated status.`);
    return;
  }

  // Look up pending order
  const { data: pendingOrder, error: pendingError } = await supabase
    .from("pending_orders")
    .select("*")
    .eq("id", pendingOrderId)
    .single();

  if (pendingError || !pendingOrder) {
    console.error(`Webhook: pending order not found: ${pendingOrderId}`, pendingError);
    return;
  }

  // Create the purchase (backup path)
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      user_id: pendingOrder.user_id,
      product_id: pendingOrder.product_id,
      product_type: pendingOrder.product_type,
      product_name: pendingOrder.product_name,
      amount: captureAmount,
      currency: captureCurrency,
      status: "active",
      payment_method: "paypal",
      paypal_order_id: paypalOrderId,
      paypal_capture_id: captureId,
      coupon_id: pendingOrder.coupon_id,
      affiliate_id: pendingOrder.affiliate_id,
      dialect_id: pendingOrder.dialect_id,
      level_id: pendingOrder.level_id,
    })
    .select("id")
    .single();

  if (purchaseError) {
    if (purchaseError.code === "23505") {
      console.log(`Webhook: purchase created by concurrent process (unique constraint), orderId=${paypalOrderId}`);
      return;
    }
    console.error("Webhook: purchase creation error:", purchaseError);
    return;
  }

  console.log(`Webhook: BACKUP purchase created: ${purchase.id}, user: ${pendingOrder.user_id}, product: ${pendingOrder.product_id}`);

  // Update coupon usage
  if (pendingOrder.coupon_id) {
    await supabase.rpc("increment_coupon_usage", { coupon_id: pendingOrder.coupon_id });
  }

  // Handle affiliate commission
  if (pendingOrder.affiliate_id) {
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, commission_rate, total_earnings")
      .eq("id", pendingOrder.affiliate_id)
      .single();

    if (affiliate) {
      const commissionRate = affiliate.commission_rate || 10;
      const commissionAmount = pendingOrder.amount * (commissionRate / 100);

      await supabase.from("affiliate_commissions").insert({
        affiliate_id: affiliate.id,
        purchase_id: purchase.id,
        commission_amount: commissionAmount,
        status: "pending",
      });

      await supabase
        .from("affiliates")
        .update({ total_earnings: (affiliate.total_earnings || 0) + commissionAmount })
        .eq("id", affiliate.id);

      console.log(`Webhook: affiliate commission created: ${commissionAmount}`);
    }
  }

  // Clean up pending order
  await supabase.from("pending_orders").delete().eq("id", pendingOrderId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    console.log("PayPal webhook received:", body.event_type);
    
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

    switch (body.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureId = body.resource.id;
        const orderId = body.resource.supplementary_data?.related_ids?.order_id;
        const customId = body.resource.custom_id;
        const captureAmount = parseFloat(body.resource.amount?.value || "0");
        const captureCurrency = body.resource.amount?.currency_code || "USD";

        console.log(`Webhook CAPTURE.COMPLETED: captureId=${captureId}, orderId=${orderId}, customId=${customId}`);

        if (orderId && customId) {
          // customId is the pending_order_id
          await ensurePurchaseExists(supabase, orderId, captureId, captureAmount, captureCurrency, customId);
        } else {
          // Try to find by capture ID directly and update status
          const { data: purchase } = await supabase
            .from("purchases")
            .select("id, status")
            .eq("paypal_capture_id", captureId)
            .maybeSingle();

          if (purchase && purchase.status !== "active") {
            await supabase
              .from("purchases")
              .update({ status: "active" })
              .eq("id", purchase.id);
            console.log(`Webhook: updated purchase ${purchase.id} to active`);
          }
        }
        break;
      }

      case "CHECKOUT.ORDER.APPROVED": {
        // Order approved but not yet captured — the client-side flow will capture
        // If client doesn't capture within ~3 hours, PayPal auto-voids
        console.log("Webhook: order approved, awaiting capture via client flow");
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        const captureId = body.resource.id;
        const newStatus = body.event_type === "PAYMENT.CAPTURE.REFUNDED" ? "refunded" : "failed";
        
        await supabase
          .from("purchases")
          .update({ status: newStatus })
          .eq("paypal_capture_id", captureId);
        
        console.log(`Webhook: updated purchase status to ${newStatus} for capture ${captureId}`);
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
