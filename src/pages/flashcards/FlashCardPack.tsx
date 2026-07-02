import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Check, ArrowRight, Sparkles } from "lucide-react";

export default function FlashCardPack() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: pack, isLoading } = useQuery({
    queryKey: ["fc-pack", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_packs")
        .select("id,slug,title,description,price_cents,currency,product_id,seo_title,seo_description,access_type")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: freeUnit } = useQuery({
    queryKey: ["fc-pack-free-unit"],
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

  if (isLoading) return <Layout><div className="container py-16">Loading…</div></Layout>;
  if (!pack) return <Layout><div className="container py-16">Pack not found.</div></Layout>;

  const price = (pack.price_cents / 100).toFixed(2);
  const checkoutTarget = pack.product_id ? `/checkout?productId=${pack.product_id}` : null;
  const checkoutHref = checkoutTarget
    ? user
      ? checkoutTarget
      : `/signup?redirect=${encodeURIComponent(checkoutTarget)}`
    : "/flashcards";

  const freeStudyTarget = freeUnit ? `/flashcards/unit/${freeUnit.slug}?from=home` : null;
  const freeHref = freeStudyTarget
    ? user
      ? freeStudyTarget
      : `/signup?redirect=${encodeURIComponent(freeStudyTarget)}`
    : null;

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pack.title,
    description: pack.description,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: pack.currency,
      availability: "https://schema.org/InStock",
      url: `https://arabiyapath.com/flashcards/pack/${pack.slug}`,
    },
  };

  return (
    <Layout>
      <SEOHead
        title={pack.seo_title || pack.title}
        description={pack.seo_description || pack.description || "Premium MSA Arabic flash cards."}
        canonicalPath={`/flashcards/pack/${pack.slug}`}
        jsonLd={productLd}
      />
      <section className="container max-w-2xl py-12 px-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{pack.title}</h1>
        <p className="text-muted-foreground mb-6">{pack.description}</p>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
              ArabiyaPath Membership
            </div>
            <p className="text-4xl font-bold mb-2">Unlimited access</p>
            <p className="text-sm text-muted-foreground mb-6">
              Full membership includes every unit and every learning mode.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              <Button size="lg" className="w-full gap-2" asChild>
                <Link to="/pricing">
                  Join Membership
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              {freeHref && (
                <Button size="lg" variant="outline" className="w-full gap-2" asChild>
                  <Link to={freeHref}>
                    <Sparkles className="w-4 h-4" />
                    Start Free
                  </Link>
                </Button>
              )}
            </div>

            <ul className="text-left max-w-sm mx-auto space-y-2 mb-6 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> All units and levels</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Native MSA audio with full tashkeel</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Speaking & listening practice</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Smart quizzes with SRS</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Progress + streak tracking</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Certificate on completion</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Cancel anytime · 30-day money-back guarantee
            </p>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
