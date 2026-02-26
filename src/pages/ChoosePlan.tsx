import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check,
  BookOpen,
  Package,
  Sparkles,
  Shield,
  Clock,
  Award,
} from "lucide-react";

const beginnerFeatures = [
  "Core structured lessons",
  "Native audio + transliteration",
  "Quizzes & practice",
  "Progress tracking",
  "Certificate",
];

const bundleFeatures = [
  "All 3 levels (Beginner → Advanced)",
  "All lessons + quizzes + certificates",
  "Lifetime access",
  "1 Private Evaluation Session (Live)",
];

const faqs = [
  {
    q: "Do I get lifetime access?",
    a: "Yes. You pay once and get lifetime access to all content included in your plan. No recurring charges, ever.",
  },
  {
    q: "Is there a refund?",
    a: "Absolutely. We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund — no questions asked.",
  },
  {
    q: "Can I upgrade later?",
    a: "Yes! You can upgrade from Beginner to the Full Bundle anytime. We recommend the Full Bundle for the best value.",
  },
];

export default function ChoosePlan() {
  const { dialectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: products, isLoading } = useQuery({
    queryKey: ["choose-plan-products", dialectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, dialects(id, name), levels(name)")
        .eq("dialect_id", dialectId!)
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!dialectId,
  });

  const { beginnerPlan, bundlePlan, dialectName } = useMemo(() => {
    if (!products)
      return { beginnerPlan: null, bundlePlan: null, dialectName: "" };
    const beginner = products.find(
      (p) => p.scope === "level" && (p.levels as any)?.name === "Beginner"
    );
    const bundle = products.find((p) => p.scope === "bundle");
    return {
      beginnerPlan: beginner || null,
      bundlePlan: bundle || null,
      dialectName: (products[0]?.dialects as any)?.name || "Arabic",
    };
  }, [products]);

  const handleSelect = (productId: string) => {
    const checkoutUrl = `/checkout?productId=${productId}`;
    if (user) {
      navigate(checkoutUrl);
    } else {
      navigate(
        `/signup?redirect=${encodeURIComponent(checkoutUrl)}`
      );
    }
  };

  const totalBeginnerPrice = beginnerPlan
    ? Number(beginnerPlan.price) * 3
    : 0;
  const bundleSavings =
    bundlePlan && beginnerPlan
      ? totalBeginnerPrice - Number(bundlePlan.price)
      : 0;

  return (
    <FocusLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          {/* ─── 1. Hero ─── */}
          <div className="text-center mb-10 md:mb-14">
            <h1 className="text-3xl sm:text-4xl md:text-[2.6rem] leading-tight font-bold text-foreground mb-3">
              Choose your plan to keep learning{" "}
              <span className="text-gradient">{dialectName || "Arabic"}</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              You already finished your first lesson — now keep building real
              speaking confidence.
            </p>

            {/* Trust row */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" />
                One-time payment
              </span>
              <span className="hidden sm:inline text-border">·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                Lifetime access
              </span>
              <span className="hidden sm:inline text-border">·</span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" />
                30-day money-back guarantee
              </span>
            </div>
          </div>

          {/* ─── 2. Plan Cards ─── */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
              <Skeleton className="h-[440px] rounded-2xl" />
              <Skeleton className="h-[440px] rounded-2xl" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto items-start">
              {/* A) Beginner Level */}
              {beginnerPlan && (
                <div className="bg-card rounded-2xl border border-border p-7 sm:p-8 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">
                      Beginner Level
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start strong with the basics
                    </p>
                  </div>

                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      ${Number(beginnerPlan.price)}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      one-time
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {beginnerFeatures.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => handleSelect(beginnerPlan.id)}
                  >
                    Get Beginner Access
                  </Button>
                </div>
              )}

              {/* B) Full Bundle — highlighted */}
              {bundlePlan && (
                <div className="relative bg-card rounded-2xl border-2 border-secondary p-7 sm:p-8 flex flex-col shadow-gold md:scale-[1.03] md:origin-top">
                  {/* Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      Most Popular
                    </div>
                  </div>

                  <div className="text-center mb-6 pt-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-6 h-6 text-secondary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">
                      Full Bundle
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Best value — everything from beginner to advanced
                    </p>
                  </div>

                  <div className="text-center mb-6">
                    {bundleSavings > 0 && (
                      <span className="text-lg text-muted-foreground line-through mr-2">
                        ${totalBeginnerPrice}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-foreground">
                      ${Number(bundlePlan.price)}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      one-time
                    </span>
                  </div>

                  <ul className="space-y-3 mb-4 flex-1">
                    {bundleFeatures.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs text-center text-muted-foreground mb-5">
                    Private Evaluation Session included —{" "}
                    <span className="font-semibold text-secondary">
                      $30 value
                    </span>
                  </p>

                  <Button
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    size="lg"
                    onClick={() => handleSelect(bundlePlan.id)}
                  >
                    Get Full Access
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── 3. FAQ mini ─── */}
          <div className="max-w-2xl mx-auto mt-16 md:mt-20">
            <h2 className="text-xl font-bold text-foreground text-center mb-6">
              Quick Questions
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="bg-card rounded-xl border border-border px-5"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline text-sm">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* ─── 4. Bottom reassurance ─── */}
          <p className="text-center text-sm text-muted-foreground mt-12 md:mt-16 pb-4">
            No subscriptions. Pay once. Learn forever.
          </p>
        </div>
      </div>
    </FocusLayout>
  );
}
