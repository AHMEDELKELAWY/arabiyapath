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

interface PurchaseInfo {
  level_id: string | null;
  dialect_id: string | null;
  product_name: string | null;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo | null>(null);

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

        // Fetch the most recent purchase to get level/dialect info
        if (session.session?.user?.id) {
          const { data: purchase } = await supabase
            .from("purchases")
            .select("level_id, dialect_id, product_name, products (name)")
            .eq("user_id", session.session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (purchase) {
            const canonicalName = (purchase.products as any)?.name ?? purchase.product_name;
            setPurchaseInfo({
              level_id: purchase.level_id,
              dialect_id: purchase.dialect_id,
              product_name: canonicalName
            });
          }
        }

        setStatus("success");
        setMessage("Your payment was successful! You now have access to your course.");
        toast.success("Payment successful!");
        
        // Invalidate purchases query to refresh access immediately
        await queryClient.invalidateQueries({ queryKey: ["purchases", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["user-purchases", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["dialects-full"] });
      } catch (error) {
        console.error("Capture error:", error);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Payment verification failed");
        toast.error("Payment verification failed");
      }
    };

    capturePayment();
  }, [searchParams, queryClient, user?.id]);

  const handleStartLearning = () => {
    if (purchaseInfo?.level_id) {
      navigate(`/learn/level/${purchaseInfo.level_id}`);
    } else if (purchaseInfo?.dialect_id) {
      navigate(`/learn/dialect/${purchaseInfo.dialect_id}`);
    } else {
      navigate("/dialects");
    }
  };

  return (
    <Layout>
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
              <div className="space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payment Successful!</h1>
                <p className="text-sm sm:text-base text-muted-foreground">{message}</p>
                {purchaseInfo?.product_name && (
                  <p className="text-sm font-medium text-primary">
                    You purchased: {purchaseInfo.product_name}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Button onClick={handleStartLearning} className="w-full sm:w-auto">
                    Start Learning Now
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full sm:w-auto">
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                  <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payment Failed</h1>
                <p className="text-sm sm:text-base text-muted-foreground">{message}</p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Button onClick={() => navigate("/pricing")} className="w-full sm:w-auto">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/contact")} className="w-full sm:w-auto">
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
