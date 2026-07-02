import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateOrganizationSchema, generateWebSiteSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Award,
  Clock,
  Users,
  BookOpen,
  Mic,
  Headphones,
  Sparkles,
  Repeat,
  TrendingUp,
  Image as ImageIcon,
  Volume2,
  RefreshCw,
} from "lucide-react";
import { MembershipPricingSection } from "@/components/pricing/MembershipPricingSection";
import { PRODUCT_NAME } from "@/lib/membershipPlans";
import { useAuth } from "@/contexts/AuthContext";

const organizationSchema = generateOrganizationSchema();
const websiteSchema = generateWebSiteSchema();

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let start = 0;
          const duration = 1500;
          const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const platformFeatures = [
  { icon: Volume2, title: "Native Audio", desc: "Every card and lesson recorded by a native Arabic speaker." },
  { icon: ImageIcon, title: "Real Images", desc: "Learn vocabulary through realistic photos, not cartoons." },
  { icon: Mic, title: "Speaking Practice", desc: "Record yourself and compare against native pronunciation." },
  { icon: Headphones, title: "Listening Practice", desc: "Train your ear with immersive audio exercises." },
  { icon: BookOpen, title: "Smart Quizzes", desc: "Adaptive quizzes that focus on what you struggle with." },
  { icon: TrendingUp, title: "Progress Dashboard", desc: "Track mastery, streaks, and time to your certificate." },
  { icon: Repeat, title: "Spaced Repetition", desc: "Review the right card at the right time — automatically." },
  { icon: Award, title: "Certificate", desc: "Earn a completion certificate you can share." },
  { icon: RefreshCw, title: "Continuous Updates", desc: "New units, cards, and lessons added every month." },
];

export default function Index() {
  const { user } = useAuth();
  const startFreeHref = user ? "/flashcards" : `/signup?redirect=${encodeURIComponent("/flashcards")}`;

  return (
    <>
      <SEOHead
        canonicalPath="/"
        title="ArabiyaPath Membership — Learn Arabic Every Day"
        description="Premium Arabic learning membership. Native audio, real images, speaking, listening, quizzes, and progress tracking. Start free — no credit card."
        jsonLd={[organizationSchema, websiteSchema]}
      />
      <Layout>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/15 text-secondary text-xs font-semibold mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                {PRODUCT_NAME}
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 animate-slide-up leading-tight">
                Learn Arabic Every Day
                <span className="text-gradient block mt-2">on a Premium Membership</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                Native audio, real images, speaking practice, listening drills, smart quizzes, and progress tracking — one membership, unlimited access.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <Button size="xl" variant="hero" asChild>
                  <Link to={startFreeHref}>
                    Start Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing">Join Membership</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                Free Unit 1 · No credit card · Cancel anytime
              </p>
            </div>
          </div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Instructor / Trust */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Built by a Certified Arabic Instructor
              </h2>
              <p className="text-lg text-muted-foreground">
                Every unit is designed by a professional Arabic tutor with real classroom and online experience.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Award, label: "Certified Arabic Instructor", number: null },
                { icon: Clock, label: "Teaching Hours", number: 700 },
                { icon: Users, label: "Active Students", number: 50 },
                { icon: BookOpen, label: "Specialized in Non-Native Learners", number: null },
              ].map((item) => (
                <div
                  key={item.label}
                  className="text-center p-5 rounded-2xl bg-card border border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-6 h-6 text-accent-foreground" />
                  </div>
                  {item.number ? (
                    <p className="text-2xl font-bold text-primary mb-1">
                      <AnimatedNumber target={item.number} suffix="+" />
                    </p>
                  ) : null}
                  <p className="text-sm font-medium text-foreground leading-snug">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Features */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Everything you need to actually speak Arabic
              </h2>
              <p className="text-lg text-muted-foreground">
                All included in your membership. Nothing to buy separately.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {platformFeatures.map((f) => (
                <div
                  key={f.title}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
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
        <div className="bg-muted/30">
          <MembershipPricingSection />
        </div>

        {/* Final CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-card rounded-3xl p-8 md:p-12 border border-border shadow-xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Start Learning Arabic Today
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Unit 1 is free. Explore the platform, then upgrade whenever you're ready.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" asChild>
                  <Link to={startFreeHref}>
                    Start Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing">Upgrade to Membership</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
