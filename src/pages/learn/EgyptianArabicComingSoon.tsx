import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, getDialectSEO } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

export default function EgyptianArabicComingSoon() {
  const seo = getDialectSEO("Egyptian Arabic");

  return (
    <>
      <SEOHead
        title="Egyptian Arabic — Coming Soon"
        description={seo.description}
        canonicalPath="/learn/egyptian-arabic"
        robots="noindex,follow"
      />
      <Layout>
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Egyptian Arabic <span className="text-gradient">— Coming Soon</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-10">
                We’re building the Egyptian Arabic path next. Want early access? Join the waitlist and we’ll notify you
                when it launches.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" asChild>
                  <Link to="/contact?subject=Egyptian%20Arabic%20Waitlist">
                    Join Waitlist <Mail className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing">
                    Explore Pricing <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
