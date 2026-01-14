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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Check for existing capture (idempotency)
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("paypal_order_id", orderId)
      .maybeSingle();

    if (existingPurchase) {
      console.log("Order already captured:", orderId);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Order already processed",
          alreadyCaptured: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Capture the order
    const accessToken = await getPayPalAccessToken();

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
      const error = await captureResponse.text();
      console.error("PayPal capture error:", error);
      throw new Error("Failed to capture PayPal payment");
    }

    const captureData = await captureResponse.json();
    console.log("PayPal payment captured:", captureData.id);

    // Get the pending order ID from custom_id
    const purchaseUnit = captureData.purchase_units[0];
    const capture = purchaseUnit.payments.captures[0];
    const pendingOrderId = purchaseUnit.custom_id;

    console.log("Pending order ID from PayPal:", pendingOrderId);

    // Fetch pending order data
    const { data: pendingOrder, error: pendingError } = await supabase
      .from("pending_orders")
      .select("*")
      .eq("id", pendingOrderId)
      .single();

    if (pendingError || !pendingOrder) {
      console.error("Pending order not found:", pendingError);
      throw new Error("Order data not found");
    }

    console.log("Pending order data:", pendingOrder);

    // Verify user matches
    if (pendingOrder.user_id !== user.id) {
      throw new Error("User mismatch");
    }

    // Update coupon usage if applicable
    if (pendingOrder.coupon_id) {
      const { error: couponError } = await supabase.rpc("increment_coupon_usage", {
        coupon_id: pendingOrder.coupon_id,
      });
      if (couponError) {
        console.error("Coupon update error:", couponError);
      }
    }

    // Create purchase record with affiliate tracking
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        user_id: user.id,
        product_id: pendingOrder.product_id,
        product_type: pendingOrder.product_type,
        product_name: pendingOrder.product_name,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        status: "active",
        payment_method: "paypal",
        paypal_order_id: captureData.id,
        paypal_capture_id: capture.id,
        coupon_id: pendingOrder.coupon_id,
        affiliate_id: pendingOrder.affiliate_id,
        dialect_id: pendingOrder.dialect_id,
        level_id: pendingOrder.level_id,
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      console.error("Purchase record error:", purchaseError);
      throw new Error("Failed to create purchase record");
    }

    console.log("Purchase created:", purchase.id);

    // Handle affiliate commission if applicable
    if (pendingOrder.affiliate_id) {
      console.log("Processing affiliate commission for:", pendingOrder.affiliate_id);

      // Get affiliate data
      const { data: affiliate, error: affiliateError } = await supabase
        .from("affiliates")
        .select("id, commission_rate, total_earnings")
        .eq("id", pendingOrder.affiliate_id)
        .single();

      if (affiliateError) {
        console.error("Affiliate lookup error:", affiliateError);
      } else if (affiliate) {
        const commissionRate = affiliate.commission_rate || 10;
        const commissionAmount = pendingOrder.amount * (commissionRate / 100);

        console.log(`Commission: ${commissionRate}% of ${pendingOrder.amount} = ${commissionAmount}`);

        // Create commission record
        const { error: commissionError } = await supabase
          .from("affiliate_commissions")
          .insert({
            affiliate_id: affiliate.id,
            purchase_id: purchase.id,
            commission_amount: commissionAmount,
            status: "pending",
          });

        if (commissionError) {
          console.error("Commission insert error:", commissionError);
        } else {
          console.log("Commission record created");

          // Update affiliate total earnings
          const newTotalEarnings = (affiliate.total_earnings || 0) + commissionAmount;
          const { error: updateError } = await supabase
            .from("affiliates")
            .update({ total_earnings: newTotalEarnings })
            .eq("id", affiliate.id);

          if (updateError) {
            console.error("Affiliate earnings update error:", updateError);
          } else {
            console.log(`Affiliate earnings updated to: ${newTotalEarnings}`);
          }
        }
      }
    }

    // Delete the pending order after successful processing
    const { error: deleteError } = await supabase
      .from("pending_orders")
      .delete()
      .eq("id", pendingOrderId);

    if (deleteError) {
      console.error("Pending order cleanup error:", deleteError);
    } else {
      console.log("Pending order cleaned up");
    }

    console.log("Purchase completed for user:", user.id);

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
