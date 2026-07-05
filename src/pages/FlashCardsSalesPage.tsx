import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Award,
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Mic,
  Headphones,
  BookOpen,
  Repeat,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MembershipPricingSection } from "@/components/pricing/MembershipPricingSection";
import { PRODUCT_NAME } from "@/lib/membershipPlans";

const featureCards = [
  { icon: Volume2, title: "Native Audio", desc: "Learn from crisp recordings by a native Arabic speaker." },
  { icon: ImageIcon, title: "Real Images", desc: "Photo-based vocabulary for visual memory." },
  { icon: Mic, title: "Speaking Practice", desc: "Record and compare to native pronunciation." },
  { icon: Headphones, title: "Listening Practice", desc: "Immersive listening drills for every unit." },
  { icon: BookOpen, title: "Smart Quizzes", desc: "Adaptive quizzes with instant feedback." },
  { icon: TrendingUp, title: "Progress Dashboard", desc: "Track streaks, mastery, and time to certificate." },
  { icon: Repeat, title: "Spaced Repetition", desc: "See the right card at the right time — automatically." },
  { icon: Award, title: "Certificate", desc: "Earn a completion certificate you can share." },
  { icon: RefreshCw, title: "Continuous Updates", desc: "New units and lessons added every month." },
];

export default function FlashCardsSalesPage() {
  const { user } = useAuth();
  const startFreeHref = user ? "/flashcards" : `/signup?redirect=${encodeURIComponent("/flashcards")}`;

  return (
    <Layout>
      <SEOHead
        title={`${PRODUCT_NAME} — Learn Arabic Every Day`}
        description="Join the ArabiyaPath Membership: native audio, real images, speaking practice, listening drills, smart quizzes, and progress tracking. Start free."
        canonicalPath="/flashcards-pack"
      />

      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.04]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/15 text-secondary text-xs font-semibold mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              {PRODUCT_NAME}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Learn Arabic Every Day{" "}
              <span className="text-gradient">on a Premium Membership</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Native audio, real images, speaking, listening, quizzes, and progress tracking — all included, unlimited access.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="px-8" asChild>
                <Link to={startFreeHref}>Start Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8" asChild>
                <Link to="/pricing">Join Membership</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Free Unit 1 · No credit card · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureCards.map((f) => (
              <div
                key={f.title}
                className="bg-card rounded-2xl border border-border p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <MembershipPricingSection />
    </Layout>
  );
}
