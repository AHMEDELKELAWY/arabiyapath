import { useEffect, useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { setPartnerCoupon } from "@/lib/partnerCoupon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  Check,
  BookOpen,
  Mic,
  Headphones,
  Brain,
  TrendingUp,
  Smartphone,
  ArrowRight,
} from "lucide-react";

const PACK_SLUG = "msa-flashcards-pack";

interface PartnerRow {
  id: string;
  slug: string;
  display_name: string;
  campaign_title: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  cta_text: string | null;
  price_override: number | null;
  old_price: number | null;
  landing_enabled: boolean;
  coupons: { code: string; percent_off: number } | null;
}

export default function PartnerLanding() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: partner, isLoading, error } = useQuery({
    queryKey: ["partner", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("partners")
        .select(
          "id, slug, display_name, campaign_title, hero_title, hero_subtitle, cta_text, price_override, old_price, landing_enabled, coupons (code, percent_off)"
        )
        .eq("slug", slug)
        .eq("landing_enabled", true)
        .maybeSingle();
      if (error) throw error;
      return data as PartnerRow | null;
    },
    enabled: !!slug,
  });

  const { data: pack } = useQuery({
    queryKey: ["fc-pack", PACK_SLUG],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_packs")
        .select("id, product_id, price_cents, currency")
        .eq("slug", PACK_SLUG)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const couponCode = partner?.coupons?.code || null;
  const discount = partner?.coupons?.percent_off ?? 0;
  const basePrice = pack ? pack.price_cents / 100 : partner?.old_price ?? 29.99;
  const finalPrice = useMemo(() => {
    if (partner?.price_override != null) return Number(partner.price_override);
    if (discount > 0) return Math.round(basePrice * (1 - discount / 100) * 100) / 100;
    return basePrice;
  }, [partner, basePrice, discount]);
  const oldPrice = partner?.old_price ?? basePrice;

  // Persist the coupon for the rest of the session — checkout will auto-apply it.
  useEffect(() => {
    if (couponCode) setPartnerCoupon(couponCode);
  }, [couponCode]);

  const checkoutTarget = pack?.product_id
    ? `/checkout?productId=${pack.product_id}`
    : "/flashcards-pack";
  const ctaHref = user
    ? checkoutTarget
    : `/signup?redirect=${encodeURIComponent(checkoutTarget)}`;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 space-y-6">
          <Skeleton className="h-12 w-2/3 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-64 w-full max-w-3xl mx-auto rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (error || !partner) {
    return <Navigate to="/" replace />;
  }

  const benefits = [
    { icon: BookOpen, text: "Thousands of real vocabulary cards" },
    { icon: Headphones, text: "Native pronunciation" },
    { icon: Sparkles, text: "Beautiful, realistic images" },
    { icon: Brain, text: "Smart spaced repetition" },
    { icon: Mic, text: "Speaking & listening practice" },
    { icon: TrendingUp, text: "Track your daily progress" },
    { icon: Smartphone, text: "Study on phone, tablet or desktop" },
    { icon: Check, text: "Just minutes a day — every day" },
  ];

  const included = [
    "Learn",
    "Speaking Practice",
    "Listening Practice",
    "Test Yourself",
    "Unlimited Reviews",
    "Progress Tracking",
  ];

  const heroTitle = partner.hero_title || partner.campaign_title || `Exclusive Offer for ${partner.display_name}'s Students`;
  const heroSubtitle =
    partner.hero_subtitle ||
    "Continue improving your Arabic every day with the ArabiyaPath Flashcards Course.";
  const ctaText = partner.cta_text || "Unlock My Discount";

  return (
    <Layout>
      <SEOHead
        title={`${heroTitle} — ArabiyaPath`}
        description={heroSubtitle}
        canonicalPath={`/partner/${partner.slug}`}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24">
        <div className="absolute inset-0 pattern-overlay opacity-30 pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-secondary text-secondary-foreground font-bold text-sm shadow-gold mb-6">
              <Sparkles className="w-4 h-4" />
              {discount}% OFF
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              {heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {heroSubtitle}
            </p>

            <div className="inline-flex flex-col items-center gap-2 mb-8">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl text-muted-foreground line-through">
                  ${oldPrice.toFixed(2)}
                </span>
                <span className="text-5xl md:text-6xl font-bold text-primary">
                  ${finalPrice.toFixed(2)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                One-time payment · Lifetime access
              </span>
            </div>

            <div>
              <Button size="lg" className="px-8 h-14 text-base shadow-teal" asChild>
                <Link to={ctaHref}>
                  {ctaText} <ArrowRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Your exclusive discount will be applied automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
            Everything you need to keep improving
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((b) => (
              <div
                key={b.text}
                className="bg-card border border-border rounded-2xl p-5 text-center"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "1", t: "Open your exclusive offer", d: "You're already here — the discount is reserved for you." },
              { n: "2", t: "Create your account", d: "Takes less than a minute. Your coupon stays applied." },
              { n: "3", t: "Start learning immediately", d: "Lifetime access on phone, tablet and desktop." },
            ].map((s) => (
              <div key={s.n} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-4">
                  {s.n}
                </div>
                <h3 className="font-bold text-foreground mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED + PRICING */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <div className="bg-card border border-border rounded-2xl p-8">
              <h3 className="text-xl font-bold text-foreground mb-5">What's included</h3>
              <ul className="space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-teal relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-gold">
                {discount}% OFF
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1 text-center">
                Flashcards Course
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-5">
                Lifetime access
              </p>
              <div className="text-center mb-5">
                <div className="text-sm text-muted-foreground line-through">
                  Regular price ${oldPrice.toFixed(2)}
                </div>
                <div className="text-5xl font-bold text-primary mt-1">
                  ${finalPrice.toFixed(2)}
                </div>
                {couponCode && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Coupon <span className="font-mono font-bold">{couponCode}</span> auto-applied
                  </div>
                )}
              </div>
              <Button size="lg" className="w-full h-12" asChild>
                <Link to={ctaHref}>Get Instant Access</Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                30-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>How long do I have access?</AccordionTrigger>
              <AccordionContent>
                Lifetime access. Pay once, study forever — including all future updates to the pack.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Can I study on mobile?</AccordionTrigger>
              <AccordionContent>
                Yes. The course works on phone, tablet and desktop. Just log in and your progress
                follows you everywhere.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Is this suitable for beginners?</AccordionTrigger>
              <AccordionContent>
                Absolutely. Cards are organised by difficulty with native audio and images so you can
                start from zero and progress at your own pace.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>How is the discount applied?</AccordionTrigger>
              <AccordionContent>
                Automatically. Your exclusive coupon{couponCode ? ` (${couponCode})` : ""} is saved
                the moment you land here and applied at checkout — you never have to type it.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="text-center mt-10">
            <Button size="lg" className="px-8 h-14 text-base shadow-teal" asChild>
              <Link to={ctaHref}>
                {ctaText} <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
