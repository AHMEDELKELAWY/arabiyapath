import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Image as ImageIcon,
  Volume2,
  Repeat,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";

const PACK_SLUG = "msa-flashcards-pack";

const features = [
  "All flash card units included",
  "Realistic image flash cards",
  "Native Arabic audio",
  "Spaced repetition review",
  "Progress tracking",
  "Lifetime access",
];

const featureCards = [
  {
    icon: ImageIcon,
    title: "Real Images",
    desc: "Learn vocabulary through realistic visual memory cues.",
  },
  {
    icon: Volume2,
    title: "Native Audio",
    desc: "Hear accurate Arabic pronunciation.",
  },
  {
    icon: Repeat,
    title: "Spaced Repetition",
    desc: "Review vocabulary at the ideal time.",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    desc: "Monitor mastery and learning streaks.",
  },
];

export default function FlashCardsSalesPage() {
  const { user } = useAuth();

  const { data: pack, isLoading } = useQuery({
    queryKey: ["fc-pack", PACK_SLUG],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_packs")
        .select("id,slug,title,description,price_cents,currency,product_id,access_type")
        .eq("slug", PACK_SLUG)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: freeUnit } = useQuery({
    queryKey: ["fc-sales-free-unit"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("slug,title_en")
        .eq("is_free", true)
        .eq("published", true)
        .order("order_index")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { slug: string; title_en: string } | null;
    },
  });

  const price = pack ? pack.price_cents / 100 : 19.99;
  const productName = "Modern Standard Arabic Flash Cards";

  const productLd = pack && {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description:
      "Master Arabic vocabulary using realistic images, native pronunciation, and scientifically proven spaced repetition.",
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: pack.currency || "USD",
      availability: "https://schema.org/InStock",
      url: "https://arabiyapath.com/flashcards-pack",
    },
  };

  const checkoutTarget = pack?.product_id ? `/checkout?productId=${pack.product_id}` : "/flashcards";
  const checkoutHref = user
    ? checkoutTarget
    : `/signup?redirect=${encodeURIComponent(checkoutTarget)}`;
  const freeStudyTarget = freeUnit ? `/flashcards/study/${freeUnit.slug}?from=home` : "/flashcards";
  const freeHref = user
    ? freeStudyTarget
    : `/signup?redirect=${encodeURIComponent(freeStudyTarget)}`;

  return (
    <Layout>
      <SEOHead
        title="Modern Standard Arabic Flash Cards Pack — ArabiyaPath"
        description="Master Arabic vocabulary with realistic images, native audio, and spaced repetition. Lifetime access for $19.99."
        canonicalPath="/flashcards-pack"
        jsonLd={productLd || undefined}
      />

      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.04]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/15 text-secondary text-xs font-semibold mb-5">
              <Award className="w-3.5 h-3.5" />
              Premium MSA Flash Cards
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Modern Standard Arabic{" "}
              <span className="text-gradient">Flash Cards Pack</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Master Arabic vocabulary using realistic images, native
              pronunciation, and scientifically proven spaced repetition.
            </p>
            <div className="flex items-baseline justify-center gap-2 mb-6">
              <span className="text-5xl font-bold text-foreground">
                ${price.toFixed(2)}
              </span>
              <span className="text-muted-foreground">/ one-time</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="px-8" disabled={isLoading || !pack} asChild>
                <Link to={checkoutHref}>Get Lifetime Access</Link>
              </Button>
              {freeUnit && (
                <Button size="lg" variant="outline" className="px-8 gap-2" asChild>
                  <Link to={freeHref}>
                    <Sparkles className="w-4 h-4" />
                    Try Free Unit
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              One-time payment · Lifetime access · 30-day guarantee
            </p>
          </div>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((f) => (
              <div
                key={f.title}
                className="bg-card rounded-2xl border border-border p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing card */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            {isLoading ? (
              <Skeleton className="h-[480px] rounded-2xl" />
            ) : (
              <div className="relative bg-card rounded-2xl border-2 border-secondary p-8 shadow-gold">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">
                    {productName}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visual vocabulary training
                  </p>
                </div>
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-sm"> /one-time</span>
                </div>
                <div className="flex flex-col gap-3 mb-6">
                  <Button
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    size="lg"
                    disabled={!pack}
                    asChild
                  >
                    <Link to={checkoutHref}>Get Lifetime Access</Link>
                  </Button>
                  {freeUnit && (
                    <Button className="w-full" size="lg" variant="outline" asChild>
                      <Link to={freeHref}>Try Free Unit</Link>
                    </Button>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-center text-muted-foreground">
                  Secure checkout with coupons, PayPal, and card payments.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
