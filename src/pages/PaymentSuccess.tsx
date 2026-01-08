import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const capturePayment = async () => {
      const token = searchParams.get("token"); // PayPal order ID
      
      if (!token) {
        setStatus("error");
        setMessage("No payment token found");
        return;
      }

      try {
        const { data: session } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-capture-order`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session?.access_token}`,
            },
            body: JSON.stringify({ orderId: token }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Payment capture failed");
        }

        setStatus("success");
        setMessage("Your payment was successful! You now have access to your course.");
        toast.success("Payment successful!");
        
        // Invalidate purchases query to refresh access immediately
        await queryClient.invalidateQueries({ queryKey: ["purchases", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["dialects-full"] });
      } catch (error) {
        console.error("Capture error:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Payment verification failed");
        toast.error("Payment verification failed");
      }
    };

    capturePayment();
  }, [searchParams]);

  return (
    <Layout>
      <div className="container max-w-lg py-20">
        <Card>
          <CardContent className="p-8 text-center">
            {status === "loading" && (
              <div className="space-y-4">
                <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
                <h1 className="text-2xl font-bold">Processing Payment...</h1>
                <p className="text-muted-foreground">
                  Please wait while we confirm your payment.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
                <p className="text-muted-foreground">{message}</p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dialects")}>
                    Start Learning
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Payment Failed</h1>
                <p className="text-muted-foreground">{message}</p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/pricing")}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/contact")}>
                    Contact Support
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
