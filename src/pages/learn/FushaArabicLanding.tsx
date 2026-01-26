import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateCourseSchema, getDialectSEO } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Globe2, Award } from "lucide-react";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { DirectAnswer } from "@/components/seo/DirectAnswer";

const FUSHA_DIRECT_ANSWER = "This Fusha (Modern Standard Arabic) course is ideal for learners who want Arabic for reading, media, and formal communication. Each lesson includes native audio, English translation, and transliteration to support pronunciation and practice. Start with a free lesson, then continue through the beginner track to build strong foundations.";

export default function FushaArabicLanding() {
  const seo = getDialectSEO("Modern Standard Arabic");
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Fusha Arabic", path: "/learn/fusha-arabic" },
  ]);
  const courseSchema = generateCourseSchema(
    "Modern Standard Arabic",
    seo.description,
    "/learn/fusha-arabic"
  );

  return (
    <>
      <SEOHead
        title="Learn Fusha Arabic (Modern Standard Arabic)"
        description={seo.description}
        canonicalPath="/learn/fusha-arabic"
        jsonLd={[breadcrumbSchema, courseSchema]}
      />
      <Layout>
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Learn <span className="text-gradient">Fusha Arabic</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Master Modern Standard Arabic (MSA) for media, academia, and professional communication.
                Build a strong foundation with structured lessons, quizzes, and certificates.
              </p>

              {/* Direct Answer Block */}
              <div className="max-w-3xl mx-auto mb-10">
                <DirectAnswer
                  text={FUSHA_DIRECT_ANSWER}
                  linksTitle="Next steps"
                  links={[
                    { href: "/signup?redirect=/learn/fusha-arabic", label: "Sign Up Free" },
                    { href: "/pricing?course=fusha", label: "View Pricing" },
                    { href: "/learn/gulf-arabic", label: "Gulf Arabic" },
                  ]}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" className="w-full sm:w-auto" asChild>
                  <Link to="/signup?redirect=/learn/fusha-arabic">
                    Start Learning Free <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/pricing?course=fusha">
                    View Pricing
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Globe2,
                  title: "Formal Arabic",
                  description: "The standard Arabic used across news, education, and official contexts.",
                },
                {
                  icon: BookOpen,
                  title: "Clear structure",
                  description: "Dialect → Level → Unit → Lesson progression so you always know what to learn next.",
                },
                {
                  icon: Award,
                  title: "Certificates",
                  description: "Prove your progress with shareable certificates as you complete levels.",
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
