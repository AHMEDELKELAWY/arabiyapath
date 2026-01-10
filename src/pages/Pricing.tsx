import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, BookOpen, GraduationCap, Trophy } from "lucide-react";
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

// Features per level type
const levelFeatures: Record<string, string[]> = {
  Beginner: [
    "8 foundational units",
    "64+ audio lessons",
    "Unit quizzes",
    "Completion certificate",
    "Lifetime access",
  ],
  Intermediate: [
    "8 practical units",
    "64+ audio lessons",
    "Real-world scenarios",
    "Completion certificate",
    "Lifetime access",
  ],
  Advanced: [
    "8 mastery units",
    "64+ audio lessons",
    "Professional topics",
    "Completion certificate",
    "Lifetime access",
  ],
};

const bundleFeatures = [
  "All dialects included",
  "All levels (Beginner → Advanced)",
  "190+ audio lessons",
  "All quizzes & certificates",
  "Priority support",
  "Lifetime access",
  "Future content updates",
];

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  highlighted: boolean;
  cta: string;
  badge?: string;
  levelName?: string;
  dialectName?: string;
}

const levelIcons: Record<string, typeof BookOpen> = {
  Beginner: BookOpen,
  Intermediate: GraduationCap,
  Advanced: Trophy,
};

const levelColors: Record<string, string> = {
  Beginner: "text-emerald-600 dark:text-emerald-400",
  Intermediate: "text-blue-600 dark:text-blue-400",
  Advanced: "text-purple-600 dark:text-purple-400",
};

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
  {
    q: "Can I upgrade later?",
    a: "Absolutely! You can purchase additional levels anytime. Consider the All Access Bundle for best value.",
  },
];

export default function Pricing() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const { data: dbProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["products-with-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, dialects(name), levels(name)")
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Group products: levels first, then bundle
  const { levelPlans, bundlePlan } = useMemo(() => {
    if (!dbProducts) return { levelPlans: [], bundlePlan: null };

    const levels: Plan[] = [];
    let bundle: Plan | null = null;

    dbProducts.forEach((product) => {
      if (product.scope === "level" && product.levels?.name) {
        levels.push({
          id: product.id,
          name: product.name,
          description: product.description || `Master ${product.levels.name} ${product.dialects?.name || "Arabic"}`,
          price: Number(product.price),
          period: "one-time",
          features: levelFeatures[product.levels.name] || levelFeatures.Beginner,
          highlighted: false,
          cta: "Get Started",
          levelName: product.levels.name,
          dialectName: product.dialects?.name,
        });
      } else if (product.scope === "all" || product.scope === "bundle") {
        bundle = {
          id: product.id,
          name: product.name,
          description: product.description || "Complete access to all content",
          price: Number(product.price),
          period: "one-time",
          features: bundleFeatures,
          highlighted: true,
          cta: "Get Full Access",
          badge: "Best Value",
        };
      }
    });

    // Sort levels by order: Beginner, Intermediate, Advanced
    const levelOrder = ["Beginner", "Intermediate", "Advanced"];
    levels.sort((a, b) => 
      levelOrder.indexOf(a.levelName || "") - levelOrder.indexOf(b.levelName || "")
    );

    return { levelPlans: levels, bundlePlan: bundle };
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
              One-time payment, lifetime access. Choose your level or get everything with the bundle.
            </p>
          </div>
        </div>
      </section>

      {/* Level Pricing Cards */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                🏜️ Gulf Arabic Levels
              </h2>
              <p className="text-muted-foreground">
                Start with any level or get them all
              </p>
            </div>

            {productsLoading ? (
              <div className="grid md:grid-cols-3 gap-6">
                <Skeleton className="h-[450px] rounded-3xl" />
                <Skeleton className="h-[450px] rounded-3xl" />
                <Skeleton className="h-[450px] rounded-3xl" />
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {levelPlans.map((plan) => {
                  const Icon = levelIcons[plan.levelName || "Beginner"] || BookOpen;
                  const colorClass = levelColors[plan.levelName || "Beginner"];
                  
                  return (
                    <div
                      key={plan.id}
                      className="relative bg-card rounded-3xl border-2 border-border p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
                    >
                      <div className="text-center mb-6">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-muted")}>
                          <Icon className={cn("w-6 h-6", colorClass)} />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-1">{plan.levelName}</h2>
                        <p className="text-muted-foreground text-sm">{plan.description}</p>
                      </div>

                      <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                          <span className="text-muted-foreground text-sm">/{plan.period}</span>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-foreground text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSelectPlan(plan)}
                      >
                        {plan.cta}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bundle Card */}
            {bundlePlan && (
              <div className="max-w-xl mx-auto">
                <div className="relative bg-card rounded-3xl border-2 border-primary shadow-xl p-8 scale-105">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold shadow-gold">
                      <Sparkles className="w-4 h-4" />
                      {bundlePlan.badge}
                    </div>
                  </div>

                  <div className="text-center mb-8 pt-2">
                    <h2 className="text-2xl font-bold text-foreground mb-2">{bundlePlan.name}</h2>
                    <p className="text-muted-foreground text-sm">{bundlePlan.description}</p>
                  </div>

                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-foreground">${bundlePlan.price}</span>
                      <span className="text-muted-foreground">/{bundlePlan.period}</span>
                    </div>
                    <p className="text-sm text-primary mt-2">
                      Save ${(levelPlans.reduce((sum, p) => sum + p.price, 0) - bundlePlan.price).toFixed(2)} compared to buying separately
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {bundlePlan.features.map((feature) => (
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
                    className="w-full"
                    onClick={() => handleSelectPlan(bundlePlan)}
                  >
                    {bundlePlan.cta}
                  </Button>
                </div>
              </div>
            )}
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
              {/* Plan Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="font-semibold text-foreground">{selectedPlan.name}</p>
                <p className="text-2xl font-bold text-primary">${selectedPlan.price}</p>
              </div>

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