import { useEffect, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/seo/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { setPartnerCoupon } from "@/lib/partnerCoupon";
import { buildPartnerConfig } from "@/lib/partnerConfig";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { PartnerHero } from "@/components/partner/PartnerHero";
import { VideoSection } from "@/components/partner/VideoSection";
import { StatsSection } from "@/components/partner/StatsSection";
import { BenefitsSection } from "@/components/partner/BenefitsSection";
import { ProductExperienceSection } from "@/components/partner/ProductExperienceSection";
import { ProductFeatureSection } from "@/components/partner/ProductFeatureSection";
import { CertificateSection } from "@/components/partner/CertificateSection";
import { PricingSection } from "@/components/partner/PricingSection";
import { PartnerFAQ } from "@/components/partner/PartnerFAQ";
import { FinalCTA } from "@/components/partner/FinalCTA";
import { Reveal } from "@/components/partner/Reveal";
import { BackToTop } from "@/components/partner/BackToTop";

import learnAsset from "@/assets/partner/learn-bus.jpg.asset.json";
import speakingAsset from "@/assets/partner/speaking.jpg.asset.json";
import quizAsset from "@/assets/partner/quiz-traffic.jpg.asset.json";
import dashboardAsset from "@/assets/partner/dashboard.png.asset.json";

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

  // Persist coupon for the existing checkout auto-apply flow.
  useEffect(() => {
    if (config?.couponCode) setPartnerCoupon(config.couponCode);
  }, [config?.couponCode]);

  if (isLoading) {
    return (
      <PartnerShell>
        <div className="container mx-auto px-4 py-16 space-y-6">
          <Skeleton className="h-12 w-2/3 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-64 w-full max-w-3xl mx-auto rounded-2xl" />
        </div>
      </PartnerShell>
    );
  }

  if (error || !partner || !config) {
    return <Navigate to="/" replace />;
  }

  const checkoutTarget = pack?.product_id
    ? `/checkout?productId=${pack.product_id}`
    : "/flashcards-pack";
  const ctaHref = user
    ? checkoutTarget
    : `/signup?redirect=${encodeURIComponent(checkoutTarget)}`;

  return (
    <PartnerShell>
      <SEOHead
        title={`${config.headline} — ArabiyaPath`}
        description={config.subheadline}
        canonicalPath={`/partner/${config.slug}`}
      />

      <PartnerHero config={config} ctaHref={ctaHref} />

      <Reveal>
        <VideoSection videoUrl={config.videoUrl} ctaLabel={config.ctaLabel} ctaHref={ctaHref} />
      </Reveal>

      <Reveal>
        <StatsSection stats={config.stats} />
      </Reveal>

      <Reveal>
        <BenefitsSection benefits={config.benefits} />
      </Reveal>

      <Reveal>
        <ProductExperienceSection />
      </Reveal>

      <Reveal>
        <ProductFeatureSection
          eyebrow="Learn mode"
          title="Learn with realistic images and native audio"
          description="Every flashcard pairs a real photo with fully-vowelized Arabic and one-tap native pronunciation. Meaning lands on the first look."
          bullets={[
            "Realistic images, not illustrations",
            "Fully vowelized Arabic + transliteration",
            "One-tap native pronunciation",
            "Daily review queue powered by SRS",
          ]}
          image={learnAsset}
          alt="Learn mode flashcard showing a bus with Arabic word, transliteration and audio"
          side="left"
        />
      </Reveal>

      <Reveal>
        <ProductFeatureSection
          eyebrow="Speaking mode"
          title="Speak like a native, sentence by sentence"
          description="Listen to a native speaker, then record yourself and compare. Build real speaking confidence — not just recognition."
          bullets={[
            "Listen to native pronunciation",
            "Record yourself in one tap",
            "Practice full sentences, not isolated words",
            "Flip back any time to review meaning",
          ]}
          image={speakingAsset}
          alt="Speaking mode with listen to native and record yourself buttons"
          side="right"
        />
      </Reveal>

      <Reveal>
        <ProductFeatureSection
          eyebrow="Test Yourself"
          title="Interactive quizzes with instant feedback"
          description="Lock in what you've learned with quick, focused quizzes. Correct answers light up instantly so progress feels obvious."
          bullets={[
            "10-question quizzes after every unit",
            "Instant green-highlight feedback",
            "Mixes audio, words, and images",
            "Tracks your mastery automatically",
          ]}
          image={quizAsset}
          alt="Quiz question with Traffic Light highlighted as the correct answer"
          side="left"
        />
      </Reveal>

      <Reveal>
        <ProductFeatureSection
          eyebrow="Your dashboard"
          title="Track streaks, mastery and what's due today"
          description="Every session counts. The dashboard shows your streak, what's due, and how many cards you've mastered — so it's easy to keep going."
          bullets={[
            "Daily streak that rewards consistency",
            "See exactly what's due today",
            "Track mastered cards across units",
            "Pick up where you left off in one tap",
          ]}
          image={dashboardAsset}
          alt="Dashboard showing Mastered, Due today, and Streak for Flash Cards"
          side="right"
        />
      </Reveal>

      <Reveal>
        <CertificateSection />
      </Reveal>

      <Reveal>
        <PricingSection config={config} ctaHref={ctaHref} />
      </Reveal>

      <Reveal>
        <PartnerFAQ items={config.faq} />
      </Reveal>

      <Reveal>
        <FinalCTA config={config} ctaHref={ctaHref} />
      </Reveal>

      <BackToTop />
    </PartnerShell>
  );
}
