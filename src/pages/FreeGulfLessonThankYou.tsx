import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, BookOpen, Play } from "lucide-react";

export default function FreeGulfLessonThankYou() {
  return (
    <>
      <SEOHead
        canonicalPath="/free-gulf-lesson/thank-you"
        title="Your Free Lesson is Ready | ArabiyaPath"
        description="Access your free Gulf Arabic lesson now and start speaking Arabic today."
        noindex={true}
      />
      <Layout>
        {/* Confirmation Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
                Your Free Lesson is Ready!
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Check your inbox for a welcome email. In the meantime, start your first Gulf Arabic lesson now.
              </p>
              <Button size="xl" variant="hero" asChild>
                <Link to="/learn/gulf-arabic">
                  <Play className="w-5 h-5" />
                  Watch Lesson Now
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Book Introduction Section */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="bg-card rounded-3xl p-8 md:p-12 border border-border shadow-lg text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Want a Clear Roadmap to Arabic?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                  <strong className="text-foreground">Your Keys to Arabic</strong> shows you exactly how to move from beginner to confident speaker — without overwhelm.
                </p>
                <Button size="lg" variant="outline" asChild>
                  <a 
                    href="https://yourkeystoarabic.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Get the Book
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* What's Next Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                What's Next?
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { step: "1", title: "Watch Your Lesson", description: "Start with basics that matter" },
                  { step: "2", title: "Check Your Email", description: "More tips coming your way" },
                  { step: "3", title: "Explore the Course", description: "Full path to fluency" },
                ].map((item) => (
                  <div key={item.step} className="text-center bg-card rounded-xl p-6 border border-border">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to Go Further?
            </h2>
            <p className="text-muted-foreground mb-6">
              Unlock all lessons, quizzes, and certificates.
            </p>
            <Button size="lg" asChild>
              <Link to="/pricing?course=gulf">
                View Gulf Arabic Pricing
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>
      </Layout>
    </>
  );
}
