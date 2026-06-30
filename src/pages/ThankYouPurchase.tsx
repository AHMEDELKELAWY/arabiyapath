import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, LayoutDashboard } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

export default function ThankYouPurchase() {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Purchase", { currency: "USD", value: 14.99 });
    }
  }, []);

  return (
    <FocusLayout>
      <SEOHead
        title="Payment Successful | ArabiyaPath"
        description="Your course access is now active. Start learning Arabic today."
        noindex
      />
      <div className="container max-w-lg px-4 py-16 sm:py-24">
        <Card className="border-0 shadow-xl">
          <CardContent className="space-y-6 p-8 text-center sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Payment successful 🎉</h1>
              <p className="text-muted-foreground">Your course access is now active.</p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Link to="/dashboard">
                <Button size="lg" className="w-full gap-2">
                  <LayoutDashboard className="h-5 w-5" />
                  Go to Dashboard
                </Button>
              </Link>
              <Link to="/dashboard/progress#flashcards-section">
                <Button size="lg" variant="outline" className="w-full gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Open Flashcards Progress
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </FocusLayout>
  );
}
