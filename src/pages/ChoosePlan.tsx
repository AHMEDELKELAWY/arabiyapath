import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, BookOpen, Package, Sparkles, Shield, ArrowLeft } from "lucide-react";
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
    if (!products) return { beginnerPlan: null, bundlePlan: null, dialectName: "" };
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
      navigate(`/signup?redirect=${encodeURIComponent(checkoutUrl)}`);
    }
  };

  const totalBeginnerPrice = beginnerPlan ? Number(beginnerPlan.price) * 3 : 0;
  const bundleSavings =
    bundlePlan && beginnerPlan ? totalBeginnerPrice - Number(bundlePlan.price) : 0;

  return (
    <Layout>
      <section className="py-12 md:py-20 min-h-[70vh]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Choose Your Plan
              </h1>
              <p className="text-muted-foreground">
                {dialectName} — One-time payment, lifetime access
              </p>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-[400px] rounded-2xl" />
                <Skeleton className="h-[400px] rounded-2xl" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Beginner Card */}
                {beginnerPlan && (
                  <div className="bg-card rounded-2xl border border-border p-7 flex flex-col">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Beginner Course</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Start your Arabic journey
                      </p>
                    </div>

                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold text-foreground">
                        ${Number(beginnerPlan.price)}
                      </span>
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

                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => handleSelect(beginnerPlan.id)}
                    >
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
                        Recommended
                      </div>
                    </div>

                    <div className="text-center mb-6 pt-3">
                      <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                        <Package className="w-6 h-6 text-secondary" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Full Bundle</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Everything you need to master Arabic
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
                      Private Evaluation Session included —{" "}
                      <span className="font-semibold text-secondary">$30 Value</span>
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

            {/* Trust bar */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Secure payment
              </span>
              <span>·</span>
              <span>30-day money-back guarantee</span>
              <span>·</span>
              <span>Lifetime access</span>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
