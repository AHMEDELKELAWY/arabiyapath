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
    const error = await response.text();
    console.error("PayPal auth error:", error);
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
    const { productType, couponCode } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Authorization required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Invalid authentication");
    }

    const userId = user.id;

    // Fetch product from database by ID (UUID)
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, dialect_id, level_id, scope")
      .eq("id", productType)
      .single();

    if (productError || !product) {
      console.error("Product lookup error:", productError);
      throw new Error("Invalid product type");
    }

    let finalPrice = product.price;
    let discountPercent = 0;
    let couponId: string | null = null;
    let affiliateId: string | null = null;

    // Apply coupon if provided
    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (!couponError && coupon) {
        // Check if coupon is still valid
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          throw new Error("Coupon has expired");
        }
        if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
          throw new Error("Coupon usage limit reached");
        }

        discountPercent = coupon.discount_percent || coupon.percent_off || 0;
        couponId = coupon.id;
        affiliateId = coupon.affiliate_id || null;
        finalPrice = Math.round(product.price * (1 - discountPercent / 100) * 100) / 100;
        
        console.log(`Coupon ${couponCode} applied: ${discountPercent}% off, affiliate_id: ${affiliateId}`);
      }
    }

    console.log(`Creating order for ${product.name}, price: $${finalPrice}, discount: ${discountPercent}%, user: ${userId}`);

    // If 100% discount, skip PayPal and create purchase directly
    if (finalPrice === 0) {
      // Update coupon usage
      if (couponId) {
        const { error: couponUpdateError } = await supabase.rpc("increment_coupon_usage", {
          coupon_id: couponId,
        });
        if (couponUpdateError) {
          console.error("Coupon update error:", couponUpdateError);
        }
      }

      // Create purchase record with affiliate tracking
      const { data: purchase, error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          user_id: userId,
          product_id: product.id,
          product_type: product.scope,
          product_name: product.name,
          amount: 0,
          currency: "USD",
          status: "active",
          payment_method: "free_coupon",
          coupon_id: couponId,
          affiliate_id: affiliateId,
          dialect_id: product.dialect_id,
          level_id: product.level_id,
        })
        .select("id")
        .single();

      if (purchaseError) {
        console.error("Purchase error:", purchaseError);
        throw new Error("Failed to create purchase record");
      }

      console.log(`Free access granted via coupon. Affiliate ${affiliateId || 'none'} tracked but no commission on $0 sale.`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          freeAccess: true,
          message: "Access granted with 100% discount coupon"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DEDUP: Reuse existing non-expired pending_order for same user+product ===
    const { data: existingPending } = await supabase
      .from("pending_orders")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let pendingOrderId: string;

    if (existingPending) {
      // Reuse existing pending order — update amount/coupon if changed
      pendingOrderId = existingPending.id;
      await supabase
        .from("pending_orders")
        .update({
          amount: finalPrice,
          coupon_id: couponId,
          affiliate_id: affiliateId,
        })
        .eq("id", pendingOrderId);
      console.log(`Reusing existing pending order: ${pendingOrderId}`);
    } else {
      // Create new pending order
      const { data: pendingOrder, error: pendingError } = await supabase
        .from("pending_orders")
        .insert({
          user_id: userId,
          product_id: product.id,
          product_type: product.scope,
          product_name: product.name,
          amount: finalPrice,
          coupon_id: couponId,
          affiliate_id: affiliateId,
          dialect_id: product.dialect_id,
          level_id: product.level_id,
        })
        .select("id")
        .single();

      if (pendingError || !pendingOrder) {
        console.error("Pending order error:", pendingError);
        throw new Error("Failed to create pending order");
      }
      pendingOrderId = pendingOrder.id;
      console.log(`New pending order created: ${pendingOrderId}`);
    }

    // Create PayPal order with pending_order_id in custom_id
    const accessToken = await getPayPalAccessToken();
    const origin = req.headers.get("origin") || "https://arabiyapath.com";

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: finalPrice.toFixed(2),
            },
            description: product.name,
            custom_id: pendingOrderId,
          },
        ],
        application_context: {
          brand_name: "ArabiyaPath",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          // Include pending_order_id in return URL so PaymentSuccess page can find it
          return_url: `${origin}/payment/success?pending_order_id=${pendingOrderId}`,
          cancel_url: `${origin}/payment/cancel`,
        },
      }),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error("PayPal order error:", error);
      throw new Error("Failed to create PayPal order");
    }

    const order = await orderResponse.json();
    console.log(`PayPal order created: ${order.id}, pending_order: ${pendingOrderId}, user: ${userId}, product: ${product.id}`);

    return new Response(
      JSON.stringify({ 
        orderId: order.id,
        pendingOrderId: pendingOrderId,
        approvalUrl: order.links.find((l: any) => l.rel === "approve")?.href,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create order error:", error);
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
