import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateOrganizationSchema, generateWebSiteSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Award, Clock, Users, BookOpen, MessageCircle, Infinity, Video } from "lucide-react";
import { trackBookTrial } from "@/lib/analytics";

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

export default function Index() {
  return (
    <>
      <SEOHead
        canonicalPath="/"
        title=""
        description="Speak Gulf or Modern Standard Arabic with confidence. Structured beginner-friendly courses by a certified Arabic instructor with 700+ teaching hours."
        jsonLd={[organizationSchema, websiteSchema]}
      />
      <Layout>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 animate-slide-up leading-tight">
                Speak Gulf or Modern Standard Arabic with Confidence
                <span className="text-gradient block mt-2">— Even as a Beginner</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                Structured step-by-step courses designed by a certified Arabic instructor with 700+ teaching hours — trusted by 50+ active students worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <Button
                  size="xl"
                  variant="hero"
                  asChild
                  onClick={() => trackBookTrial("Start Free Gulf Lesson", "hero_section")}
                >
                  <Link to="/free-gulf-lesson">
                    Start Free Gulf Lesson
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing">Explore Beginner Course</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                700+ teaching hours · 50+ active students · Lifetime access
              </p>
            </div>
          </div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Meet Your Instructor Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Meet Your Instructor
              </h2>
              <p className="text-lg text-muted-foreground">
                Learn Arabic with a certified instructor trusted by students worldwide.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-10">
              {[
                { icon: Award, label: "Certified Arabic Instructor on Preply", number: null },
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
            <p className="text-center text-muted-foreground max-w-2xl mx-auto text-base">
              All ArabiyaPath courses are structured and designed by a professional Arabic tutor with real classroom and online teaching experience.
            </p>
          </div>
        </section>

        {/* Choose Your Path Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Choose Your Path
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Gulf Arabic Card */}
              <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4">🏜️</div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Gulf Arabic</h3>
                <p className="text-muted-foreground text-sm mb-8">For daily life in the UAE &amp; GCC</p>
                <div className="flex flex-col gap-3 w-full">
                  <Button size="lg" asChild>
                    <Link to="/pricing">Beginner Course</Link>
                  </Button>
                  <div className="relative">
                    <Badge variant="secondary" className="absolute -top-3 right-2 z-10 text-xs shadow-gold">
                      🔥 Most Popular
                    </Badge>
                    <Button size="lg" variant="secondary" className="w-full flex-col h-auto py-3" asChild>
                      <Link to="/pricing">
                        <span>Full Bundle</span>
                        <span className="text-xs font-normal opacity-80">Includes 1 Private Evaluation Session</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* MSA Card */}
              <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4">📜</div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Modern Standard Arabic</h3>
                <p className="text-muted-foreground text-sm mb-8">For reading, formal Arabic &amp; wider understanding</p>
                <div className="flex flex-col gap-3 w-full">
                  <Button size="lg" asChild>
                    <Link to="/pricing">Beginner Course</Link>
                  </Button>
                  <Button size="lg" variant="secondary" className="flex-col h-auto py-3" asChild>
                    <Link to="/pricing">
                      <span>Full Bundle</span>
                      <span className="text-xs font-normal opacity-80">Includes 1 Private Evaluation Session</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  icon: MessageCircle,
                  title: "Progress from Zero to Real Conversations",
                  description: "Clear structured levels from Beginner to Advanced.",
                },
                {
                  icon: Infinity,
                  title: "Learn Once — Access Forever",
                  description: "Lifetime access. No subscriptions.",
                },
                {
                  icon: Video,
                  title: "Get Personal Feedback from Your Instructor",
                  description: "1 Private Evaluation Session included in every Full Bundle.",
                },
              ].map((benefit) => (
                <div key={benefit.title} className="text-center p-6 rounded-2xl hover:bg-card hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-card rounded-3xl p-8 md:p-12 border border-border shadow-xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Start?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Try your first Gulf Arabic lesson for free — no account required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="xl"
                  variant="hero"
                  asChild
                  onClick={() => trackBookTrial("Start Free Gulf Lesson", "cta_section")}
                >
                  <Link to="/free-gulf-lesson">
                    Start Free Gulf Lesson
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
