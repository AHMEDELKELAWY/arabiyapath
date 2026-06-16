import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");

  if (!clientId || !secret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${secret}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Creates a purchase record from a pending order + PayPal capture data.
 * Returns the purchase id, or null if it already exists (idempotent).
 */
async function createPurchaseFromPendingOrder(
  supabase: any,
  pendingOrder: any,
  paypalOrderId: string,
  captureId: string,
  captureAmount: number,
  captureCurrency: string
): Promise<string | null> {
  // Update coupon usage if applicable
  if (pendingOrder.coupon_id) {
    const { error: couponError } = await supabase.rpc("increment_coupon_usage", {
      coupon_id: pendingOrder.coupon_id,
    });
    if (couponError) {
      console.error("Coupon update error:", couponError);
    }
  }

  // Create purchase record
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
    // Check if it's a unique constraint violation (already exists)
    if (purchaseError.code === "23505") {
      console.log(`Purchase already exists for paypal_order_id=${paypalOrderId} (unique constraint)`);
      return null;
    }
    console.error("Purchase record error:", purchaseError);
    throw new Error("Failed to create purchase record");
  }

  console.log(`Purchase created: ${purchase.id}, user: ${pendingOrder.user_id}, product: ${pendingOrder.product_id}, paypal_order: ${paypalOrderId}, capture: ${captureId}`);

  // Handle affiliate commission
  if (pendingOrder.affiliate_id) {
    await processAffiliateCommission(supabase, pendingOrder, purchase.id);
  }

  // Clean up pending order
  await supabase.from("pending_orders").delete().eq("id", pendingOrder.id);

  return purchase.id;
}

async function processAffiliateCommission(supabase: any, pendingOrder: any, purchaseId: string) {
  console.log("Processing affiliate commission for:", pendingOrder.affiliate_id);

  const { data: affiliate, error: affiliateError } = await supabase
    .from("affiliates")
    .select("id, commission_rate, total_earnings")
    .eq("id", pendingOrder.affiliate_id)
    .single();

  if (affiliateError || !affiliate) {
    console.error("Affiliate lookup error:", affiliateError);
    return;
  }

  const commissionRate = affiliate.commission_rate || 10;
  const commissionAmount = pendingOrder.amount * (commissionRate / 100);

  console.log(`Commission: ${commissionRate}% of ${pendingOrder.amount} = ${commissionAmount}`);

  const { error: commissionError } = await supabase
    .from("affiliate_commissions")
    .insert({
      affiliate_id: affiliate.id,
      purchase_id: purchaseId,
      commission_amount: commissionAmount,
      status: "pending",
    });

  if (commissionError) {
    console.error("Commission insert error:", commissionError);
    return;
  }

  const newTotalEarnings = (affiliate.total_earnings || 0) + commissionAmount;
  await supabase
    .from("affiliates")
    .update({ total_earnings: newTotalEarnings })
    .eq("id", affiliate.id);

  console.log(`Affiliate earnings updated to: ${newTotalEarnings}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, pendingOrderId } = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Capture request: orderId=${orderId}, pendingOrderId=${pendingOrderId || "not provided"}`);

    // === IDEMPOTENCY CHECK: If purchase already exists for this PayPal order, return success ===
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("paypal_order_id", orderId)
      .maybeSingle();

    if (existingPurchase) {
      console.log(`Order already captured and purchase exists: orderId=${orderId}, purchaseId=${existingPurchase.id}`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Order already processed",
          alreadyCaptured: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === RESOLVE USER: Try auth header first, fall back to pending_order lookup ===
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        console.log(`User authenticated via token: ${userId}`);
      }
    }

    // If no auth (mobile redirect lost session), resolve user from pending order
    if (!userId && pendingOrderId) {
      const { data: po } = await supabase
        .from("pending_orders")
        .select("user_id")
        .eq("id", pendingOrderId)
        .single();
      if (po) {
        userId = po.user_id;
        console.log(`User resolved from pending order: ${userId}`);
      }
    }

    // === CAPTURE THE ORDER ON PAYPAL ===
    const accessToken = await getPayPalAccessToken();

    // First check order status — it may already be captured
    const statusResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
      }
    );

    if (!statusResponse.ok) {
      console.error("PayPal order status check failed:", statusResponse.status);
      throw new Error("Failed to check PayPal order status");
    }

    const orderStatus = await statusResponse.json();
    console.log(`PayPal order status: ${orderStatus.status}, orderId=${orderId}`);

    let captureData: any;

    if (orderStatus.status === "COMPLETED") {
      // Already captured — use existing data
      console.log(`Order already captured on PayPal side: ${orderId}`);
      captureData = orderStatus;
    } else if (orderStatus.status === "APPROVED") {
      // Capture now
      const captureResponse = await fetch(
        `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!captureResponse.ok) {
        const errorText = await captureResponse.text();
        console.error(`PayPal capture error: ${captureResponse.status}, body: ${errorText}`);
        
        // If capture fails with UNPROCESSABLE_ENTITY, order may already be captured
        if (captureResponse.status === 422) {
          // Re-fetch order to get capture data
          const refetchRes = await fetch(
            `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
            { headers: { "Authorization": `Bearer ${accessToken}` } }
          );
          const refetched = await refetchRes.json();
          if (refetched.status === "COMPLETED") {
            console.log(`Order was already captured (422 then COMPLETED): ${orderId}`);
            captureData = refetched;
          } else {
            throw new Error("Failed to capture PayPal payment");
          }
        } else {
          throw new Error("Failed to capture PayPal payment");
        }
      } else {
        captureData = await captureResponse.json();
        console.log(`PayPal payment captured successfully: ${orderId}`);
      }
    } else {
      // Order not yet approved or in unexpected state
      console.error(`Unexpected PayPal order status: ${orderStatus.status}`);
      throw new Error(`PayPal order is in status: ${orderStatus.status}. Please complete approval first.`);
    }

    // === EXTRACT CAPTURE DETAILS ===
    const purchaseUnit = captureData.purchase_units[0];
    const capture = purchaseUnit.payments?.captures?.[0];
    const customId = purchaseUnit.custom_id;

    if (!capture) {
      console.error("No capture found in PayPal response");
      throw new Error("Payment capture data not found");
    }

    console.log(`Capture details: captureId=${capture.id}, amount=${capture.amount.value}, customId=${customId}`);

    // Re-check idempotency after capture (race condition guard)
    const { data: existingAfterCapture } = await supabase
      .from("purchases")
      .select("id")
      .eq("paypal_order_id", orderId)
      .maybeSingle();

    if (existingAfterCapture) {
      console.log(`Purchase created by concurrent request: ${existingAfterCapture.id}`);
      return new Response(
        JSON.stringify({ success: true, alreadyCaptured: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === FIND PENDING ORDER ===
    const resolvedPendingOrderId = pendingOrderId || customId;

    if (!resolvedPendingOrderId) {
      console.error("No pending order ID available from params or custom_id");
      throw new Error("Order data not found");
    }

    const { data: pendingOrder, error: pendingError } = await supabase
      .from("pending_orders")
      .select("*")
      .eq("id", resolvedPendingOrderId)
      .single();

    if (pendingError || !pendingOrder) {
      console.error(`Pending order not found: ${resolvedPendingOrderId}`, pendingError);
      throw new Error("Order data not found");
    }

    // Verify user match if we have auth
    if (userId && pendingOrder.user_id !== userId) {
      console.error(`User mismatch: auth=${userId}, pending_order=${pendingOrder.user_id}`);
      throw new Error("User mismatch");
    }

    // === CREATE PURCHASE ===
    await createPurchaseFromPendingOrder(
      supabase,
      pendingOrder,
      captureData.id,
      capture.id,
      parseFloat(capture.amount.value),
      capture.amount.currency_code
    );

    console.log(`Capture flow completed: orderId=${orderId}, user=${pendingOrder.user_id}, product=${pendingOrder.product_id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        captureId: capture.id,
        status: captureData.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Capture order error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
