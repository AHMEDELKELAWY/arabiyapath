import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateCourseSchema, getDialectSEO } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, Headphones, Award, BookOpen } from "lucide-react";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { DirectAnswer } from "@/components/seo/DirectAnswer";

const GULF_DIRECT_ANSWER = "This Gulf Arabic course is built for expats and beginners who want real everyday conversations in the UAE, Saudi Arabia, and Qatar. Learn with native audio, English translation, and transliteration so you can pronounce and remember phrases faster. Start with a free lesson, then follow the beginner path step by step.";

export default function GulfArabicLanding() {
  const seo = getDialectSEO("Gulf Arabic");
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Gulf Arabic", path: "/learn/gulf-arabic" },
  ]);
  const courseSchema = generateCourseSchema("Gulf Arabic", seo.description, "/learn/gulf-arabic");

  return (
    <>
      <SEOHead
        title="Learn Gulf Arabic (Khaleeji)"
        description={seo.description}
        canonicalPath="/learn/gulf-arabic"
        jsonLd={[breadcrumbSchema, courseSchema]}
      />
      <Layout>
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Learn <span className="text-gradient">Gulf Arabic</span> (Khaleeji)
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Speak Arabic like a local in the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman.
                Build real conversation skills with native audio, practical lessons, and certificates.
              </p>

              {/* Direct Answer Block */}
              <div className="max-w-3xl mx-auto mb-10">
                <DirectAnswer
                  text={GULF_DIRECT_ANSWER}
                  linksTitle="Next steps"
                  links={[
                    { href: "/signup?redirect=/learn/gulf-arabic", label: "Sign Up Free" },
                    { href: "/pricing?course=gulf", label: "View Pricing" },
                    { href: "/learn/fusha-arabic", label: "Fusha Arabic" },
                  ]}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup?redirect=/learn/gulf-arabic">
                  <Button size="xl" variant="hero" className="w-full sm:w-auto">
                    Start Learning Free <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/pricing?course=gulf">
                  <Button size="xl" variant="outline" className="w-full sm:w-auto">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Headphones,
                  title: "Native audio",
                  description: "Train your ear with clear pronunciation for every key phrase.",
                },
                {
                  icon: BookOpen,
                  title: "Real scenarios",
                  description: "Learn greetings, shopping, travel, work, and daily life conversations.",
                },
                {
                  icon: Award,
                  title: "Certificates",
                  description: "Earn shareable certificates as you complete each level.",
                },
              ].map((f) => (
                <div key={f.title} className="bg-card rounded-2xl p-6 border border-border">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">{f.title}</h2>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
