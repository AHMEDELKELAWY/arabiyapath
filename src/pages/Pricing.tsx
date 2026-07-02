import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateFAQPageSchema } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { Award, ShieldCheck, RefreshCcw } from "lucide-react";
import { TrustSignals } from "@/components/pricing/TrustSignals";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MembershipPricingSection } from "@/components/pricing/MembershipPricingSection";
import { PRODUCT_NAME } from "@/lib/membershipPlans";

const faqs = [
  {
    q: "Is there a free plan?",
    a: "Yes. Unit 1 is unlocked forever with a free account — Learn, Listening, Speaking, and Quiz modes included.",
  },
  {
    q: "What's included in the paid membership?",
    a: "Every unit, every learning mode, native audio, speaking practice, listening drills, smart quizzes, spaced repetition, progress dashboard, certificate, and all future updates.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your membership at any time from your dashboard. You keep access until the end of your billing period.",
  },
  {
    q: "Which plan should I choose?",
    a: "Start Free to try Unit 1. When you're ready, Yearly is the best value at $270 (save $90). Monthly and 6-month plans are also available.",
  },
  {
    q: "What payment methods do you accept?",
    a: "PayPal and all major credit/debit cards — secure worldwide payments.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, a 30-day money-back guarantee if the membership isn't right for you.",
  },
];

export default function Pricing() {
  const faqPageSchema = generateFAQPageSchema("/pricing", faqs);
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
  ]);

  return (
    <>
      <SEOHead
        title={`${PRODUCT_NAME} — Pricing`}
        description="Join the ArabiyaPath Membership. Free plan available. Monthly, 6-month, and yearly plans with full access to native audio, speaking, listening, quizzes, and certificate."
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
                Choose your <span className="text-gradient">Membership</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                One membership. Unlimited Arabic learning. Start free — upgrade whenever you're ready.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Cancel anytime
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5">
                  <RefreshCcw className="w-4 h-4" />
                  30-day guarantee
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Certificate included
                </span>
              </div>
            </div>
          </div>
        </section>

        <MembershipPricingSection heading="Membership Plans" subheading="Everything included on every paid plan. Free plan available forever." />

        {/* Trust Signals */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <TrustSignals />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-10">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="bg-card border rounded-lg px-4">
                    <AccordionTrigger className="text-left hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
