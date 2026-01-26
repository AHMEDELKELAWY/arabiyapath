import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateFAQPageSchema } from "@/components/seo/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DirectAnswer } from "@/components/seo/DirectAnswer";

const FAQ_DIRECT_ANSWER = "Find quick answers about learning Arabic with ArabiyaPath, courses, and how to get started. Our lessons are designed for non-native speakers with native audio, English translation, and transliteration to make practice easier. If you're new, start with a free lesson and follow the beginner path.";

const faqCategories = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "Which Arabic dialect should I learn first?",
        a: "It depends on your goals. If you're interested in business in the Gulf region, choose Gulf Arabic. For media and entertainment, Egyptian Arabic is most widely understood. Modern Standard Arabic is best for formal settings and academia. You can always learn multiple dialects!",
      },
      {
        q: "Do I need any prior Arabic knowledge?",
        a: "No! Our courses are designed for complete beginners. We start from the very basics and gradually build up your skills through practical, real-world scenarios.",
      },
      {
        q: "How long does it take to complete a level?",
        a: "The Beginner level typically takes 2-3 months if you study regularly (15-30 minutes daily). However, you can learn at your own pace—there's no time limit.",
      },
      {
        q: "Can I access the lessons on mobile?",
        a: "Yes! Our platform is fully responsive and works great on phones, tablets, and computers. Learn anywhere, anytime.",
      },
    ],
  },
  {
    category: "Courses & Content",
    questions: [
      {
        q: "What topics are covered in the lessons?",
        a: "Each level covers practical daily scenarios: Greetings, Restaurant, Transportation, Shopping, Directions, Hotel, Emergencies, and Daily Routine. Every lesson includes native audio, Arabic text, and English transliteration.",
      },
      {
        q: "How do the quizzes work?",
        a: "After each unit, you'll take a quiz with 8-12 questions including multiple choice and audio-based questions. You need 70% to pass and unlock your certificate.",
      },
      {
        q: "What are the certificates for?",
        a: "Upon completing all units in a level, you receive a shareable certificate. You can download it as PDF/PNG or share directly to LinkedIn, Twitter, and Facebook to showcase your achievement.",
      },
      {
        q: "Will more levels be added in the future?",
        a: "Yes! We're actively developing Intermediate and Advanced levels. All-Access Bundle purchasers get free access to new content as it's released.",
      },
    ],
  },
  {
    category: "Pricing & Payment",
    questions: [
      {
        q: "Is there a free trial?",
        a: "Yes! You can access the first unit of any dialect completely free. No credit card required—just sign up and start learning.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept PayPal for secure payments. PayPal supports all major credit cards, debit cards, and bank transfers.",
      },
      {
        q: "Is this a subscription?",
        a: "No, it's a one-time payment with lifetime access. Once you purchase, you own the content forever with no recurring fees.",
      },
      {
        q: "Do you offer refunds?",
        a: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied for any reason, contact us for a full refund.",
      },
      {
        q: "Do coupons work with all plans?",
        a: "Coupon codes can be applied to any plan. Some coupons offer percentage discounts while others may provide free access. Enter your code at checkout.",
      },
    ],
  },
  {
    category: "Technical Support",
    questions: [
      {
        q: "The audio isn't playing. What should I do?",
        a: "First, check that your device volume is on. Try refreshing the page or using a different browser. If the issue persists, contact our support team.",
      },
      {
        q: "Can I use the platform offline?",
        a: "Currently, an internet connection is required to access lessons and track progress. We're exploring offline options for future updates.",
      },
      {
        q: "How do I reset my password?",
        a: "Click 'Forgot Password' on the login page and enter your email. You'll receive a reset link within minutes.",
      },
    ],
  },
];

export default function FAQ() {
  const faqPageSchema = generateFAQPageSchema(
    "/faq",
    faqCategories.flatMap((c) => c.questions.map((q) => ({ q: q.q, a: q.a })))
  );

  return (
    <>
      <SEOHead
        title="Frequently Asked Questions"
        description="Find answers to common questions about learning Arabic with ArabiyaPath. Get started, courses, pricing, technical support, and more."
        canonicalPath="/faq"
        jsonLd={faqPageSchema}
      />
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Find answers to common questions about learning Arabic with ArabiyaPath.
            </p>

            {/* Direct Answer Block */}
            <div className="max-w-2xl mx-auto mb-8">
              <DirectAnswer text={FAQ_DIRECT_ANSWER} />
            </div>

            {/* Ready to Start CTA */}
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/signup?redirect=/learn/gulf-arabic"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Sign Up Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-background rounded-lg border border-border text-sm font-medium text-foreground hover:border-primary/30 transition-colors cursor-pointer"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-12 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-12">
            {faqCategories.map((category) => (
              <div key={category.category}>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {category.category}
                </h2>
                <Accordion type="single" collapsible className="space-y-4">
                  {category.questions.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.category}-${index}`}
                      className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow"
                    >
                      <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Still Have Questions?
            </h2>
            <p className="text-muted-foreground mb-6">
              Our support team is here to help. Reach out and we'll get back to you 
              within 24 hours.
            </p>
            <Button asChild>
              <Link to="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
        </section>
      </Layout>
    </>
  );
}
