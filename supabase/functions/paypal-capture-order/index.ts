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

    // Parse custom data from the correct location
    const purchaseUnit = captureData.purchase_units[0];
    const capture = purchaseUnit.payments.captures[0];
    
    // custom_id is stored on the purchase unit level, not on capture
    const customIdString = purchaseUnit.custom_id || capture.custom_id || "{}";
    let customData;
    try {
      customData = JSON.parse(customIdString);
    } catch (e) {
      console.error("Failed to parse custom_id:", customIdString);
      customData = {};
    }

    console.log("Custom data parsed:", customData);

    // Verify user matches
    if (customData.userId && customData.userId !== user.id) {
      throw new Error("User mismatch");
    }

    // Update coupon usage if applicable
    if (customData.couponId) {
      const { error: couponError } = await supabase.rpc("increment_coupon_usage", {
        coupon_id: customData.couponId,
      });
      if (couponError) {
        console.error("Coupon update error:", couponError);
      }
    }

    // Create purchase record with status "active" (grants access)
    const { error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        user_id: user.id,
        product_id: customData.productId,
        product_type: customData.productType,
        product_name: purchaseUnit.description,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        status: "active",
        payment_method: "paypal",
        paypal_order_id: captureData.id,
        paypal_capture_id: capture.id,
        coupon_id: customData.couponId || null,
        dialect_id: customData.dialectId || null,
      });

    if (purchaseError) {
      console.error("Purchase record error:", purchaseError);
      throw new Error("Failed to create purchase record");
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