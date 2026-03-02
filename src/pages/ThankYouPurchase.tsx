import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, LayoutDashboard } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

export default function ThankYouPurchase() {
  useEffect(() => {
    // Fire Meta Pixel Purchase event (base pixel already loaded sitewide)
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
      <div className="container max-w-lg py-16 px-4 sm:py-24">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Payment successful 🎉
              </h1>
              <p className="text-muted-foreground">
                Your course access is now active.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Link to="/dashboard">
                <Button size="lg" className="w-full gap-2">
                  <LayoutDashboard className="w-5 h-5" />
                  Go to Dashboard
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="w-full gap-2">
                  <ArrowRight className="w-5 h-5" />
                  Start Learning
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </FocusLayout>
  );
}
