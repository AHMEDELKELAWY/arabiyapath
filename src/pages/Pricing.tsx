import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateFAQPageSchema } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Star, Award } from "lucide-react";
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
import { AllAccessHero } from "@/components/pricing/AllAccessHero";
import { DialectPricingSection } from "@/components/pricing/DialectPricingSection";
import { TrustSignals } from "@/components/pricing/TrustSignals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

const dialectBundleFeatures = [
  "All 3 levels included",
  "192+ audio lessons",
  "All quizzes & certificates",
  "Lifetime access",
];

const allAccessFeatures = [
  "All dialects included",
  "All levels (Beginner → Advanced)",
  "450+ audio lessons",
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
  features: string[];
  levelName?: string;
  dialectId?: string;
  dialectName?: string;
}

const dialectConfig: Record<string, { emoji: string; accentColor: string }> = {
  "Gulf Arabic": { emoji: "🏜️", accentColor: "sky" },
  "Modern Standard Arabic": { emoji: "📚", accentColor: "emerald" },
  "Egyptian Arabic": { emoji: "🏛️", accentColor: "amber" },
};

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! You can access the first unit of any dialect completely free before purchasing.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept PayPal and all major credit/debit cards for secure payments worldwide.",
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
  {
    q: "What's the difference between dialects?",
    a: "Gulf Arabic is spoken in UAE, Saudi Arabia, Kuwait, etc. Modern Standard Arabic (MSA) is the formal language used in media and education. Egyptian Arabic is the most widely understood dialect.",
  },
];

export default function Pricing() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const faqPageSchema = generateFAQPageSchema("/pricing", faqs);
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
  ]);

  const { data: dbProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["products-with-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, dialects(id, name), levels(name)")
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Organize products by dialect and type
  const { dialectGroups, allAccessBundle, totalAllLevelsPrice } = useMemo(() => {
    if (!dbProducts) return { dialectGroups: {}, allAccessBundle: null, totalAllLevelsPrice: 0 };

    const groups: Record<string, { levels: Plan[]; bundle: Plan | null }> = {};
    let allAccess: Plan | null = null;
    let totalPrice = 0;

    dbProducts.forEach((product) => {
      if (product.scope === "all") {
        // All Access Bundle
        allAccess = {
          id: product.id,
          name: product.name,
          description: product.description || "Complete access to all content",
          price: Number(product.price),
          features: allAccessFeatures,
        };
      } else if (product.scope === "bundle" && product.dialects?.name) {
        // Dialect-specific bundle
        const dialectName = product.dialects.name;
        if (!groups[dialectName]) {
          groups[dialectName] = { levels: [], bundle: null };
        }
        groups[dialectName].bundle = {
          id: product.id,
          name: product.name,
          description: product.description || `Complete ${dialectName} course`,
          price: Number(product.price),
          features: dialectBundleFeatures,
          dialectId: product.dialects.id,
          dialectName,
        };
      } else if (product.scope === "level" && product.levels?.name && product.dialects?.name) {
        // Individual level
        const dialectName = product.dialects.name;
        const levelName = product.levels.name;
        
        if (!groups[dialectName]) {
          groups[dialectName] = { levels: [], bundle: null };
        }
        
        groups[dialectName].levels.push({
          id: product.id,
          name: product.name,
          description: `Master ${levelName} ${dialectName}`,
          price: Number(product.price),
          features: levelFeatures[levelName] || levelFeatures.Beginner,
          levelName,
          dialectId: product.dialects.id,
          dialectName,
        });

        totalPrice += Number(product.price);
      }
    });

    // Sort levels within each dialect
    const levelOrder = ["Beginner", "Intermediate", "Advanced"];
    Object.keys(groups).forEach((dialectName) => {
      groups[dialectName].levels.sort(
        (a, b) => levelOrder.indexOf(a.levelName || "") - levelOrder.indexOf(b.levelName || "")
      );
    });

    return { dialectGroups: groups, allAccessBundle: allAccess, totalAllLevelsPrice: totalPrice };
  }, [dbProducts]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  // Determine dialect order (Gulf Arabic first, then MSA, then others)
  const dialectOrder = ["Gulf Arabic", "Modern Standard Arabic", "Egyptian Arabic"];
  const sortedDialects = Object.keys(dialectGroups).sort((a, b) => {
    const aIndex = dialectOrder.indexOf(a);
    const bIndex = dialectOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <>
      <SEOHead
        title="Pricing - Learn Arabic Online"
        description="Affordable Arabic courses with certificates. Choose individual levels, dialect bundles, or get the All Access Bundle for best value. One-time payment, lifetime access."
        canonicalPath="/pricing"
        jsonLd={[breadcrumbSchema, faqPageSchema]}
      />
      <Layout>
      {/* Hero */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              One-time payment, lifetime access
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Invest in Your <span className="text-gradient">Arabic Journey</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Choose a single level, a complete dialect bundle, or unlock everything with All Access.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                2,000+ learners
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                30-day guarantee
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* All Access Bundle - Hero Section */}
      {productsLoading ? (
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Skeleton className="h-[400px] rounded-3xl" />
            </div>
          </div>
        </section>
      ) : allAccessBundle && (
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <AllAccessHero
                plan={allAccessBundle}
                totalLevelPrice={totalAllLevelsPrice}
                onSelect={() => handleSelectPlan(allAccessBundle)}
              />
            </div>
          </div>
        </section>
      )}

      {/* Divider */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-sm font-medium">
            Or choose by dialect
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </div>

      {/* Dialect Sections */}
      {productsLoading ? (
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-16">
              <Skeleton className="h-[350px] rounded-2xl" />
              <Skeleton className="h-[350px] rounded-2xl" />
            </div>
          </div>
        </section>
      ) : (
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-20">
              {sortedDialects.map((dialectName) => {
                const group = dialectGroups[dialectName];
                const config = dialectConfig[dialectName] || { emoji: "🌍", accentColor: "teal" };

                return (
                  <DialectPricingSection
                    key={dialectName}
                    dialectName={dialectName}
                    dialectEmoji={config.emoji}
                    accentColor={config.accentColor}
                    levels={group.levels}
                    bundle={group.bundle}
                    onSelectLevel={(plan) => handleSelectPlan(plan)}
                    onSelectBundle={(plan) => handleSelectPlan(plan)}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Trust Signals */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <TrustSignals />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-center mb-10">
              Everything you need to know about our pricing
            </p>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card rounded-xl border border-border px-6"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
              <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-lg">{selectedPlan.name}</p>
                    {selectedPlan.dialectName && (
                      <p className="text-sm text-muted-foreground">{selectedPlan.dialectName}</p>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-primary">${selectedPlan.price}</p>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    ✓ One-time payment · ✓ Lifetime access · ✓ 30-day guarantee
                  </p>
                </div>
              </div>

              {authLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Verifying...</p>
                </div>
              )}
              {!authLoading && !user && (
                <div className="bg-muted/50 rounded-xl p-5 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Please sign in to continue with your purchase
                  </p>
                  <Button asChild className="w-full">
                    <Link to={`/login?redirect=${encodeURIComponent(`/checkout?productId=${selectedPlan.id}`)}`}>Sign In to Continue</Link>
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
    </>
  );
}
