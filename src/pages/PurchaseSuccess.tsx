import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, LayoutDashboard, ArrowRight, Mail } from "lucide-react";
import { trackPurchase } from "@/lib/analytics";

export default function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const purchaseId = searchParams.get("purchase");
  const orderId = searchParams.get("order");

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["purchase-success", purchaseId, orderId, user?.id],
    enabled: !!user && !!(purchaseId || orderId),
    queryFn: async () => {
      let query = supabase
        .from("purchases")
        .select(
          "id, product_id, product_name, product_type, amount, currency, status, created_at, paypal_order_id, paypal_capture_id"
        )
        .eq("user_id", user!.id);
      query = purchaseId ? query.eq("id", purchaseId) : query.eq("paypal_order_id", orderId!);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isFlashcards = purchase?.product_type === "flashcard_pack";

  const transactionId = useMemo(
    () => purchase?.paypal_capture_id || purchase?.paypal_order_id || purchase?.id || null,
    [purchase]
  );

  // GA4 purchase event — fired only after backend-verified purchase, deduped per transaction.
  useEffect(() => {
    if (!purchase || !transactionId) return;
    if (!["active", "completed"].includes(purchase.status)) return;
    const productType = purchase.product_type || "course";
    trackPurchase({
      transactionId,
      value: Number(purchase.amount ?? 0),
      currency: purchase.currency || "USD",
      productType,
      items: [
        {
          item_id: purchase.product_id,
          item_name: purchase.product_name || "ArabiyaPath course",
          item_category: productType,
          product_type: productType,
          price: Number(purchase.amount ?? 0),
          quantity: 1,
        },
      ],
    });
  }, [purchase, transactionId]);

  return (
    <FocusLayout>
      <SEOHead
        title="Purchase Successful | ArabiyaPath"
        description="Your purchase is confirmed and your access is now active."
        noindex
      />
      <div className="container max-w-xl px-4 py-12 sm:py-20">
        <Card className="border-0 shadow-xl">
          <CardContent className="space-y-6 p-6 text-center sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Payment successful 🎉</h1>
              <p className="text-muted-foreground">
                Your access is active and a receipt is on its way to your inbox.
              </p>
            </div>

            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : purchase ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-left text-sm">
                <Row label="Product" value={purchase.product_name || "ArabiyaPath course"} />
                <Row
                  label="Amount"
                  value={`${Number(purchase.amount ?? 0).toFixed(2)} ${purchase.currency || "USD"}`}
                />
                <Row
                  label="Date"
                  value={new Date(purchase.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                />
                {transactionId && <Row label="Order ID" value={transactionId} />}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2">
              <Button asChild size="lg" className="w-full gap-2">
                <Link to={isFlashcards ? "/flashcards/course/spoken-arabic" : "/dashboard"}>
                  <ArrowRight className="h-5 w-5" />
                  Start learning
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full gap-2">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                  Go to dashboard
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="w-full gap-2">
                <Link to="/contact">
                  <Mail className="h-5 w-5" />
                  Need help? Contact support
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FocusLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  );
}
