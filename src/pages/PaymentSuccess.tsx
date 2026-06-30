import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const FLASHCARD_SUCCESS_PATH = "/dashboard/progress#flashcards-section";

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
      const token = searchParams.get("token");
      const pendingOrderId = searchParams.get("pending_order_id");

      if (!token) {
        navigate("/dashboard", { replace: true });
        return;
      }

      let lastError: string | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const { data: session } = await supabase.auth.getSession();

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (session.session?.access_token) {
            headers["Authorization"] = `Bearer ${session.session.access_token}`;
          }

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-capture-order`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              orderId: token,
              pendingOrderId,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setStatus("success");

            if (user?.id) {
              await queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });
              await queryClient.invalidateQueries({ queryKey: ["user-purchases", user.id] });
              await queryClient.invalidateQueries({ queryKey: ["dialects-full"] });
              await queryClient.invalidateQueries({ queryKey: ["fc-dashboard"] });
              await queryClient.invalidateQueries({ queryKey: ["fc-resume-slug"] });
              await queryClient.invalidateQueries({ queryKey: ["fc-unit-access"] });
            }

            if (data.productType === "flashcard_pack") {
              navigate(FLASHCARD_SUCCESS_PATH, { replace: true });
              return;
            }

            navigate("/thank-you-purchase", { replace: true });
            return;
          }

          lastError = data.error || "Unknown error";
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Network error";
        }

        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS * attempt);
        }
      }

      console.error(`All ${MAX_RETRIES} capture attempts failed. Last error: ${lastError}`);
      setStatus("pending");
    };

    capturePayment();
  }, [navigate, queryClient, searchParams, user?.id]);

  return (
    <FocusLayout>
      <div className="container max-w-lg px-4 py-12 sm:py-20">
        <Card>
          <CardContent className="p-6 text-center sm:p-8">
            {status === "loading" && (
              <div className="space-y-4">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary sm:h-16 sm:w-16" />
                <h1 className="text-xl font-bold sm:text-2xl">Processing Payment...</h1>
                <p className="text-sm text-muted-foreground sm:text-base">Please wait while we confirm your payment.</p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Redirecting...</p>
              </div>
            )}

            {status === "pending" && (
              <div className="space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 sm:h-20 sm:w-20">
                  <Loader2 className="h-10 w-10 text-amber-600 sm:h-12 sm:w-12" />
                </div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">Confirming Your Payment...</h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  We received your payment and are confirming it. Your course access will appear on your dashboard shortly.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you don't see access within a few minutes, please <a href="/contact" className="text-primary underline">contact support</a>.
                </p>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
