import { useEffect, useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { setPartnerCoupon } from "@/lib/partnerCoupon";
import { buildPartnerConfig } from "@/lib/partnerConfig";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { PartnerHero } from "@/components/partner/PartnerHero";
import { StatsSection } from "@/components/partner/StatsSection";
import { VideoSection } from "@/components/partner/VideoSection";
import { BenefitsSection } from "@/components/partner/BenefitsSection";
import { PlatformShowcase } from "@/components/partner/PlatformShowcase";
import { HowItWorks } from "@/components/partner/HowItWorks";
import { PartnerCertificate } from "@/components/partner/PartnerCertificate";
import { PricingSection } from "@/components/partner/PricingSection";
import { PartnerFAQ } from "@/components/partner/PartnerFAQ";
import { FinalCTA } from "@/components/partner/FinalCTA";
import { BackToTopButton } from "@/components/partner/BackToTopButton";

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

  const config = useMemo(() => {
    if (!partner) return null;
    const basePrice = pack ? pack.price_cents / 100 : partner.old_price ?? 29.99;
    return buildPartnerConfig(partner, basePrice);
  }, [partner, pack]);

  useEffect(() => {
    if (config?.couponCode) setPartnerCoupon(config.couponCode);
  }, [config?.couponCode]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!elements.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      elements.forEach((element) => element.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [config]);

  if (isLoading) {
    return (
      <PartnerShell>
        <div className="container mx-auto space-y-6 px-4 py-16">
          <Skeleton className="mx-auto h-12 w-2/3" />
          <Skeleton className="mx-auto h-6 w-1/2" />
          <Skeleton className="mx-auto h-64 w-full max-w-4xl rounded-3xl" />
        </div>
      </PartnerShell>
    );
  }

  if (error || !partner || !config) {
    return <Navigate to="/" replace />;
  }

  const checkoutTarget = pack?.product_id ? `/checkout?productId=${pack.product_id}` : "/flashcards-pack";
  const ctaHref = user ? checkoutTarget : `/signup?redirect=${encodeURIComponent(checkoutTarget)}`;

  return (
    <PartnerShell>
      <SEOHead
        title={`Exclusive Arabic Flashcards Offer for ${config.partnerName}`}
        description={config.subheadline}
        canonicalPath={`/partner/${config.slug}`}
      />

      <div className="partner-page pb-8">
        <PartnerHero config={config} ctaHref={ctaHref} />
        <StatsSection stats={config.stats} />
        <VideoSection videoUrl={config.videoUrl} ctaLabel={config.ctaLabel} ctaHref={ctaHref} />
        <BenefitsSection modeCards={config.modeCards} />
        <PlatformShowcase
          learnFeatures={config.learnFeatures}
          listeningFeatures={config.listeningFeatures}
          speakingFeatures={config.speakingFeatures}
          quizFeatures={config.quizFeatures}
        />
        <HowItWorks highlights={config.dashboardHighlights} />
        <PartnerCertificate />
        <PricingSection config={config} ctaHref={ctaHref} />
        <PartnerFAQ items={config.faq} />
        <FinalCTA config={config} ctaHref={ctaHref} />
      </div>

      <BackToTopButton />
    </PartnerShell>
  );
}
