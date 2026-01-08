import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("PayPal webhook received:", body.event_type);

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
