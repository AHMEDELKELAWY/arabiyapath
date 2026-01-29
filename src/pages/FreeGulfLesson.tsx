import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle2, Headphones, BookOpen, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackGenerateLead } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

export default function FreeGulfLesson() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check
    if (honeypot) return;
    
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert subscriber (upsert to handle existing emails)
      const { error: insertError } = await supabase
        .from("funnel_subscribers")
        .upsert(
          { email: trimmedEmail, source: "free-gulf-lesson" },
          { onConflict: "email", ignoreDuplicates: true }
        );

      if (insertError && !insertError.message.includes("duplicate")) {
        throw insertError;
      }

      // Trigger welcome email
      await supabase.functions.invoke("send-funnel-emails", {
        body: { email: trimmedEmail, emailNumber: 0 },
      });

      // Track conversion
      trackGenerateLead("free-gulf-lesson");

      // Redirect to thank you page
      navigate("/free-gulf-lesson/thank-you");
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SEOHead
        canonicalPath="/free-gulf-lesson"
        title="Free Gulf Arabic Lesson for Expats | ArabiyaPath"
        description="Start speaking Gulf Arabic today with a free lesson. Learn the Arabic people actually speak in the Gulf — no grammar, no pressure, just real conversation."
      />
      <Layout>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-slide-up">
                Start Speaking Gulf Arabic Today
                <span className="text-gradient block mt-2">Free Lesson for Expats</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                Learn the Arabic people actually speak in the Gulf. No grammar. No pressure. Just real conversation.
              </p>
              <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <Button size="xl" variant="hero" onClick={scrollToForm}>
                  Start Free Lesson
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Why This Lesson Works */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Why This Lesson Works
              </h2>
              <div className="space-y-6">
                {[
                  "Textbook Arabic doesn't help in daily life",
                  "Grammar-heavy courses slow you down",
                  "This lesson focuses on speaking from day one",
                ].map((point, index) => (
                  <div key={index} className="flex items-start gap-4 bg-card rounded-xl p-5 border border-border">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-foreground text-lg">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What You'll Learn */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                What You'll Learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { icon: Headphones, text: "How Gulf Arabic actually sounds" },
                  { icon: BookOpen, text: "Basic greetings you can use today" },
                  { icon: Headphones, text: "Pronunciation with native audio" },
                  { icon: MapPin, text: "How the full learning path works" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-card rounded-xl p-5 border border-border">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Who This Is For
              </h2>
              <div className="space-y-4">
                {[
                  "Expats living in the Gulf (UAE, Saudi, Qatar, etc.)",
                  "Complete beginners",
                  "Learners who want to speak, not study grammar",
                ].map((qualifier, index) => (
                  <div key={index} className="flex items-center gap-4 bg-card rounded-xl p-5 border border-border">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                    <p className="text-foreground text-lg">{qualifier}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Email Form Section */}
        <section className="py-20" id="signup-form">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto">
              <div className="bg-card rounded-3xl p-8 md:p-10 border border-border shadow-xl">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
                  Get Your Free Lesson
                </h2>
                <p className="text-muted-foreground text-center mb-8">
                  Enter your email to start learning Gulf Arabic today.
                </p>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot field - hidden from users */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 text-lg"
                    disabled={isSubmitting}
                    aria-label="Email address"
                  />
                  <Button
                    type="submit"
                    size="xl"
                    variant="hero"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Get My Free Lesson
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    No spam. Unsubscribe anytime.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
