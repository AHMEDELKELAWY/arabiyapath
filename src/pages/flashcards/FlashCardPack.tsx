import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { getPaymentProvider } from "@/lib/payments/registry";
import { toast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function FlashCardPack() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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

  const handleBuy = async () => {
    if (!user) {
      navigate(`/signup?redirect=/flashcards/pack/${slug}`);
      return;
    }
    if (!pack?.product_id) {
      toast({ title: "Not available", description: "This pack isn't ready for purchase yet." });
      return;
    }
    setLoading(true);
    try {
      const provider = getPaymentProvider("paypal");
      const res = await provider.createOrder({ productId: pack.product_id });
      if (res.freeAccess) {
        toast({ title: "Access granted!" });
        navigate("/dashboard");
        return;
      }
      if (res.approvalUrl) window.location.href = res.approvalUrl;
    } catch (err: any) {
      toast({ title: "Checkout error", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <Layout><div className="container py-16">Loading…</div></Layout>;
  if (!pack) return <Layout><div className="container py-16">Pack not found.</div></Layout>;

  const price = (pack.price_cents / 100).toFixed(2);
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
            <p className="text-5xl font-bold mb-2">${price}</p>
            <p className="text-sm text-muted-foreground mb-6">
              {pack.access_type === "lifetime" ? "Lifetime access" : pack.access_type}
            </p>
            <ul className="text-left max-w-sm mx-auto space-y-2 mb-8 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> All units included</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Realistic image flash cards</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Native MSA audio with full tashkeel</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Spaced repetition (SRS) engine</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Progress + streak tracking</li>
            </ul>
            <Button size="lg" className="w-full" onClick={handleBuy} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Buy with PayPal
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Secure payment via PayPal. Coupons can be applied at checkout.
            </p>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
