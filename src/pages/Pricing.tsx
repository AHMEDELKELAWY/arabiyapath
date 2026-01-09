import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PayPalCheckout } from "@/components/checkout/PayPalCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

// Features are hardcoded since they're not in the database
const planFeatures = {
  dialect: [
    "Gulf Arabic dialect",
    "Beginner level (8 units)",
    "64+ audio lessons",
    "Unit quizzes",
    "Completion certificate",
    "Lifetime access",
  ],
  all: [
    "All dialects included",
    "Gulf, Egyptian & MSA",
    "240+ audio lessons",
    "All quizzes & certificates",
    "Priority support",
    "Lifetime access",
    "Future content updates",
  ],
};

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  originalPrice?: number;
  features: string[];
  highlighted: boolean;
  cta: string;
  badge?: string;
}

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! You can access the first unit of any dialect completely free before purchasing.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept PayPal for secure payments worldwide.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 30-day money-back guarantee if you're not satisfied.",
  },
  {
    q: "Is this a subscription?",
    a: "No, it's a one-time payment with lifetime access. No recurring charges.",
  },
];

export default function Pricing() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const { data: dbProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const plans: Plan[] = useMemo(() => {
    if (!dbProducts) return [];

    const dialectProduct = dbProducts.find((p) => p.scope === "dialect");
    const bundleProduct = dbProducts.find((p) => p.scope === "all");

    const result: Plan[] = [];

    if (dialectProduct) {
      result.push({
        id: dialectProduct.id,
        name: dialectProduct.name,
        description: dialectProduct.description || "Perfect for focused learning",
        price: Number(dialectProduct.price),
        period: "one-time",
        features: planFeatures.dialect,
        highlighted: false,
        cta: "Get Started",
      });
    }

    if (bundleProduct) {
      result.push({
        id: bundleProduct.id,
        name: bundleProduct.name,
        description: bundleProduct.description || "Best value for serious learners",
        price: Number(bundleProduct.price),
        period: "one-time",
        features: planFeatures.all,
        highlighted: true,
        cta: "Get Full Access",
        badge: "Best Value",
      });
    }

    return result;
  }, [dbProducts]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Simple, <span className="text-gradient">Transparent</span> Pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              One-time payment, lifetime access. No subscriptions, no hidden fees.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {productsLoading ? (
              <>
                <Skeleton className="h-[500px] rounded-3xl" />
                <Skeleton className="h-[500px] rounded-3xl" />
              </>
            ) : plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative bg-card rounded-3xl border-2 p-8 transition-all duration-300",
                  plan.highlighted
                    ? "border-primary shadow-xl scale-105"
                    : "border-border hover:border-primary/30 hover:shadow-lg"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold shadow-gold">
                      <Sparkles className="w-4 h-4" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h2>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-8">
                  {plan.originalPrice && (
                    <div className="text-muted-foreground line-through text-lg mb-1">
                      ${plan.originalPrice}
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Money Back Guarantee */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto bg-accent rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🛡️</span>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              30-Day Money-Back Guarantee
            </h3>
            <p className="text-muted-foreground">
              Try our courses risk-free. If you're not completely satisfied within 30 days, 
              we'll refund your purchase—no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              Pricing FAQ
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Checkout Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-6">
              {authLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جاري التحقق...</p>
                </div>
              )}
              {!authLoading && !user && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Please sign in to continue with your purchase
                  </p>
                  <Button asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                </div>
              )}
              {!authLoading && user && (
                <PayPalCheckout
                  productType={selectedPlan.id}
                  productName={selectedPlan.name}
                  price={selectedPlan.price}
                  onSuccess={() => setSelectedPlan(null)}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
