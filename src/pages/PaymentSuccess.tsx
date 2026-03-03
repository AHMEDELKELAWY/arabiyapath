import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "pending">("loading");
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const capturePayment = async () => {
      const token = searchParams.get("token"); // PayPal order ID
      const pendingOrderId = searchParams.get("pending_order_id");

      if (!token) {
        // No token at all — redirect to dashboard
        navigate("/dashboard", { replace: true });
        return;
      }

      let lastError: string | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`Capture attempt ${attempt}/${MAX_RETRIES}: orderId=${token}, pendingOrderId=${pendingOrderId}`);

          const { data: session } = await supabase.auth.getSession();

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          // Include auth token if available (may be lost on mobile redirect)
          if (session.session?.access_token) {
            headers["Authorization"] = `Bearer ${session.session.access_token}`;
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-capture-order`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                orderId: token,
                pendingOrderId: pendingOrderId,
              }),
            }
          );

          const data = await response.json();

          if (response.ok && data.success) {
            console.log("Payment captured successfully", data);
            setStatus("success");

            // Invalidate purchase queries
            if (user?.id) {
              await queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });
              await queryClient.invalidateQueries({ queryKey: ["user-purchases", user.id] });
              await queryClient.invalidateQueries({ queryKey: ["dialects-full"] });
            }

            // Redirect to thank-you page (fires Meta Pixel)
            navigate("/thank-you-purchase", { replace: true });
            return;
          }

          lastError = data.error || "Unknown error";
          console.warn(`Capture attempt ${attempt} failed: ${lastError}`);
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Network error";
          console.warn(`Capture attempt ${attempt} threw: ${lastError}`);
        }

        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS * attempt);
        }
      }

      // All retries failed — but PayPal may have captured the money.
      // Show a reassuring message, never "Payment Failed".
      console.error(`All ${MAX_RETRIES} capture attempts failed. Last error: ${lastError}`);
      setStatus("pending");
    };

    capturePayment();
  }, [searchParams, queryClient, user?.id, navigate]);

  return (
    <FocusLayout>
      <div className="container max-w-lg py-12 px-4 sm:py-20">
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            {status === "loading" && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin mx-auto text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold">Processing Payment...</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Please wait while we confirm your payment.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Redirecting...</p>
              </div>
            )}

            {status === "pending" && (
              <div className="space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                  <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-amber-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Confirming Your Payment...
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  We received your payment and are confirming it. Your course access will appear on your dashboard shortly.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you don't see access within a few minutes, please{" "}
                  <a href="/contact" className="text-primary underline">contact support</a>.
                </p>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FocusLayout>
  );
}
