import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com"; // Use sandbox for testing: https://api-m.sandbox.paypal.com

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claims?.claims?.sub) {
      console.error("Auth error:", authError);
      throw new Error("Invalid authentication");
    }

    const userId = claims.claims.sub as string;

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch product from database
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, dialect_id, scope")
      .or(`name.ilike.%${productType.replace(/-/g, ' ')}%,scope.eq.${productType === 'all-access-bundle' ? 'all' : 'dialect'}`)
      .limit(1)
      .single();

    if (productError || !product) {
      console.error("Product lookup error:", productError);
      throw new Error("Invalid product type");
    }

    let finalPrice = product.price;
    let discountPercent = 0;
    let couponId: string | null = null;

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

        discountPercent = coupon.discount_percent;
        couponId = coupon.id;
        finalPrice = Math.round(product.price * (1 - discountPercent / 100) * 100) / 100;
      }
    }

    console.log(`Creating order for ${product.name}, price: $${finalPrice}, discount: ${discountPercent}%`);

    // If 100% discount, skip PayPal and create purchase directly
    if (finalPrice === 0) {
      // Update coupon usage
      if (couponId) {
        await supabase
          .from("coupons")
          .update({ current_uses: supabase.rpc("increment", { x: 1 }) })
          .eq("id", couponId);
      }

      // Create purchase record
      const { error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          user_id: userId,
          product_id: product.id,
          product_type: productType,
          product_name: product.name,
          amount: 0,
          currency: "USD",
          status: "completed",
          payment_method: "free_coupon",
          coupon_id: couponId,
          dialect_id: product.dialect_id,
        });

      if (purchaseError) {
        console.error("Purchase error:", purchaseError);
        throw new Error("Failed to create purchase record");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          freeAccess: true,
          message: "Access granted with 100% discount coupon"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create PayPal order
    const accessToken = await getPayPalAccessToken();

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
            custom_id: JSON.stringify({
              userId: userId,
              productId: product.id,
              productType,
              couponId,
              dialectId: product.dialect_id,
            }),
          },
        ],
        application_context: {
          brand_name: "Arabic Learning Platform",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${req.headers.get("origin")}/payment/success`,
          cancel_url: `${req.headers.get("origin")}/payment/cancel`,
        },
      }),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error("PayPal order error:", error);
      throw new Error("Failed to create PayPal order");
    }

    const order = await orderResponse.json();
    console.log("PayPal order created:", order.id);

    return new Response(
      JSON.stringify({ 
        orderId: order.id,
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
