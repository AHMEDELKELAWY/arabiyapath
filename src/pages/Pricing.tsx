import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Single Dialect",
    description: "Perfect for focused learning",
    price: 49,
    period: "one-time",
    features: [
      "1 dialect of your choice",
      "Beginner level (8 units)",
      "80+ audio lessons",
      "Unit quizzes",
      "Completion certificate",
      "Lifetime access",
    ],
    highlighted: false,
    cta: "Choose Dialect",
  },
  {
    name: "All Access Bundle",
    description: "Best value for serious learners",
    price: 99,
    period: "one-time",
    originalPrice: 147,
    features: [
      "All 3 dialects included",
      "Gulf, Egyptian & MSA",
      "240+ audio lessons",
      "All quizzes & certificates",
      "Priority support",
      "Lifetime access",
      "Future content updates",
    ],
    highlighted: true,
    cta: "Get Full Access",
    badge: "Save 33%",
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! You can access the first unit of any dialect completely free before purchasing.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept PayPal for secure payments worldwide.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 30-day money-back guarantee if you're not satisfied.",
  },
  {
    q: "Is this a subscription?",
    a: "No, it's a one-time payment with lifetime access. No recurring charges.",
  },
];

export default function Pricing() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Simple, <span className="text-gradient">Transparent</span> Pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              One-time payment, lifetime access. No subscriptions, no hidden fees.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative bg-card rounded-3xl border-2 p-8 transition-all duration-300",
                  plan.highlighted
                    ? "border-primary shadow-xl scale-105"
                    : "border-border hover:border-primary/30 hover:shadow-lg"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold shadow-gold">
                      <Sparkles className="w-4 h-4" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h2>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-8">
                  {plan.originalPrice && (
                    <div className="text-muted-foreground line-through text-lg mb-1">
                      ${plan.originalPrice}
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  variant={plan.highlighted ? "hero" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link to="/signup">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Money Back Guarantee */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto bg-accent rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🛡️</span>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              30-Day Money-Back Guarantee
            </h3>
            <p className="text-muted-foreground">
              Try our courses risk-free. If you're not completely satisfied within 30 days, 
              we'll refund your purchase—no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              Pricing FAQ
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-card rounded-xl p-6 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
