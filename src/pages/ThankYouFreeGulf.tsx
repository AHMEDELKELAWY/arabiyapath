import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Play } from "lucide-react";
import { trackGenerateLead } from "@/lib/analytics";

export default function ThankYouFreeGulf() {
  useEffect(() => {
    // GA4 lead event
    trackGenerateLead("free_gulf_lesson");

    // Facebook Pixel Lead event
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Lead");
    }
  }, []);

  return (
    <>
      <SEOHead
        canonicalPath="/thank-you-free-gulf"
        title="You're In! Start Your Free Lesson | ArabiyaPath"
        description="Your free Gulf Arabic lesson is ready. Start speaking your first real sentence now."
        noindex
      />
      <Layout>
        {/* Hero Confirmation */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-4">
                You're In! 🎉
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-3">
                Your free Gulf Arabic lesson is ready.
              </p>
              <p className="text-base text-muted-foreground mb-10">
                Click below to start speaking your first real sentence in Arabic.
              </p>
              <Button size="xl" variant="hero" asChild>
                <Link to="/learn/lesson/d4e5f6a7-0101-0101-0101-000000000001">
                  <Play className="w-5 h-5" />
                  Start My Free Lesson
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Upsell Section */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto bg-card rounded-3xl p-8 md:p-10 border border-border shadow-lg">
              <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-6">
                Want to unlock the full course?
              </h2>
              <ul className="space-y-3 mb-8">
                {[
                  "150+ structured lessons",
                  "Quizzes & certificates",
                  "Lifetime access",
                  "Private evaluation session (Bundle)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm md:text-base text-muted-foreground">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="outline" className="w-full" asChild>
                <Link to="/gulf-arabic-course">
                  View Full Course
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
