import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateFAQPageSchema } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Loader2, Award, Check, Sparkles, BookOpen, Package } from "lucide-react";
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
import { TrustSignals } from "@/components/pricing/TrustSignals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const beginnerFeatures = [
  "Core structured lessons",
  "Native audio & transliteration",
  "Unit quizzes",
  "Completion certificate",
  "Lifetime access",
];

const bundleFeatures = [
  "All 3 Levels included",
  "All lessons & quizzes",
  "All certificates",
  "Lifetime access",
  "🎯 1 Private Evaluation Session",
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

const dialectConfig: Record<string, { emoji: string; label: string; subtitle: string }> = {
  "Gulf Arabic": { emoji: "🏜️", label: "Gulf Arabic", subtitle: "For daily life in the UAE & GCC" },
  "Modern Standard Arabic": { emoji: "📚", label: "Modern Standard Arabic", subtitle: "For reading, formal Arabic & wider understanding" },
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
    q: "What's included in the Private Evaluation Session?",
    a: "A 1-on-1 session with your instructor to evaluate your progress, give personal feedback, and guide your next steps. Included free in every Full Bundle ($30 value).",
  },
  {
    q: "Can I upgrade later?",
    a: "Absolutely! You can purchase additional levels anytime. Consider the Full Bundle for best value.",
  },
];

function DialectPricingCard({
  dialectName,
  emoji,
  subtitle,
  beginnerPlan,
  bundlePlan,
  onSelect,
  isHighlighted,
}: {
  dialectName: string;
  emoji: string;
  subtitle: string;
  beginnerPlan: Plan | null;
  bundlePlan: Plan | null;
  onSelect: (plan: Plan) => void;
  isHighlighted: boolean;
}) {
  const totalBeginnerPrice = beginnerPlan ? beginnerPlan.price * 3 : 0;
  const bundleSavings = bundlePlan && beginnerPlan ? totalBeginnerPrice - bundlePlan.price : 0;

  return (
    <div className={cn("scroll-mt-24", isHighlighted && "ring-2 ring-primary ring-offset-4 rounded-3xl")}>
      {/* Dialect Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-muted mb-3">
          <span className="text-2xl">{emoji}</span>
          <h2 className="text-xl font-bold text-foreground">{dialectName}</h2>
        </div>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Beginner Card */}
        {beginnerPlan && (
          <div className="bg-card rounded-2xl border border-border p-7 flex flex-col">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Beginner Course</h3>
              <p className="text-sm text-muted-foreground mt-1">Start your Arabic journey</p>
            </div>

            <div className="text-center mb-6">
              <span className="text-4xl font-bold text-foreground">${beginnerPlan.price}</span>
              <span className="text-muted-foreground text-sm"> /one-time</span>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {beginnerFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full" size="lg" onClick={() => onSelect(beginnerPlan)}>
              Get Started
            </Button>
          </div>
        )}

        {/* Full Bundle Card */}
        {bundlePlan && (
          <div className="relative bg-card rounded-2xl border-2 border-secondary p-7 flex flex-col shadow-gold">
            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                🔥 Most Popular
              </div>
            </div>

            <div className="text-center mb-6 pt-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Full Bundle</h3>
              <p className="text-sm text-muted-foreground mt-1">Everything you need to master Arabic</p>
            </div>

            <div className="text-center mb-6">
              {bundleSavings > 0 && (
                <span className="text-lg text-muted-foreground line-through mr-2">${totalBeginnerPrice}</span>
              )}
              <span className="text-4xl font-bold text-foreground">${bundlePlan.price}</span>
              <span className="text-muted-foreground text-sm"> /one-time</span>
            </div>

            <ul className="space-y-3 mb-4 flex-1">
              {bundleFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">{f}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs text-center text-muted-foreground mb-4">
              Private Evaluation Session included — <span className="font-semibold text-secondary">$30 Value</span>
            </p>

            <Button
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              size="lg"
              onClick={() => onSelect(bundlePlan)}
            >
              Get Full Access
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [searchParams] = useSearchParams();
  const courseParam = searchParams.get("course");

  const gulfSectionRef = useRef<HTMLDivElement>(null);
  const fushaSectionRef = useRef<HTMLDivElement>(null);

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

  const { dialectGroups } = useMemo(() => {
    if (!dbProducts) return { dialectGroups: {} as Record<string, { beginner: Plan | null; bundle: Plan | null }> };

    const groups: Record<string, { beginner: Plan | null; bundle: Plan | null }> = {};

    dbProducts.forEach((product) => {
      if (product.scope === "all") return; // skip all-access for now

      const dialectName = product.dialects?.name;
      if (!dialectName) return;

      if (!groups[dialectName]) {
        groups[dialectName] = { beginner: null, bundle: null };
      }

      if (product.scope === "bundle") {
        groups[dialectName].bundle = {
          id: product.id,
          name: product.name,
          description: product.description || `Complete ${dialectName} course`,
          price: Number(product.price),
          features: bundleFeatures,
          dialectId: product.dialects?.id,
          dialectName,
        };
      } else if (product.scope === "level" && product.levels?.name === "Beginner") {
        groups[dialectName].beginner = {
          id: product.id,
          name: product.name,
          description: `Beginner ${dialectName}`,
          price: Number(product.price),
          features: beginnerFeatures,
          levelName: "Beginner",
          dialectId: product.dialects?.id,
          dialectName,
        };
      }
    });

    return { dialectGroups: groups };
  }, [dbProducts]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  useEffect(() => {
    if (!productsLoading && courseParam) {
      const timeout = setTimeout(() => {
        if (courseParam === "gulf" && gulfSectionRef.current) {
          gulfSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (courseParam === "fusha" && fushaSectionRef.current) {
          fushaSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [courseParam, productsLoading]);

  const dialectOrder = ["Gulf Arabic", "Modern Standard Arabic"];
  const sortedDialects = Object.keys(dialectGroups)
    .filter((d) => dialectOrder.includes(d))
    .sort((a, b) => dialectOrder.indexOf(a) - dialectOrder.indexOf(b));

  return (
    <>
      <SEOHead
        title="Pricing - Learn Arabic Online"
        description="Affordable Arabic courses with certificates. Choose Beginner or the Full Bundle with a Private Evaluation Session. One-time payment, lifetime access."
        canonicalPath="/pricing"
        jsonLd={[breadcrumbSchema, faqPageSchema]}
      />
      <Layout>
        {/* Hero */}
        <section className="relative py-16 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Choose Your <span className="text-gradient">Learning Plan</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Start with Beginner or unlock the complete bundle with private feedback.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  One-time payment
                </span>
                <span>·</span>
                <span>Lifetime access</span>
                <span>·</span>
                <span>30-day guarantee</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dialect Pricing Sections */}
        {productsLoading ? (
          <section className="py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto space-y-16">
                <Skeleton className="h-[400px] rounded-2xl" />
                <Skeleton className="h-[400px] rounded-2xl" />
              </div>
            </div>
          </section>
        ) : (
          <section className="py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto space-y-20">
                {sortedDialects.map((dialectName) => {
                  const group = dialectGroups[dialectName];
                  const config = dialectConfig[dialectName] || { emoji: "🌍", label: dialectName, subtitle: "" };
                  const sectionRef =
                    dialectName === "Gulf Arabic" ? gulfSectionRef :
                    dialectName === "Modern Standard Arabic" ? fushaSectionRef :
                    null;
                  const isHighlighted =
                    (courseParam === "gulf" && dialectName === "Gulf Arabic") ||
                    (courseParam === "fusha" && dialectName === "Modern Standard Arabic");

                  return (
                    <div key={dialectName} ref={sectionRef}>
                      <DialectPricingCard
                        dialectName={config.label}
                        emoji={config.emoji}
                        subtitle={config.subtitle}
                        beginnerPlan={group.beginner}
                        bundlePlan={group.bundle}
                        onSelect={handleSelectPlan}
                        isHighlighted={isHighlighted}
                      />
                    </div>
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
                Everything you need to know about our plans
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
                      Create an account to complete your purchase
                    </p>
                    <Button asChild className="w-full">
                      <Link to={`/signup?redirect=${encodeURIComponent(`/checkout?productId=${selectedPlan.id}`)}`}>
                        Sign Up to Continue
                      </Link>
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
