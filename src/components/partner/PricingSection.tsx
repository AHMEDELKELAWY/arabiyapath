import { Link } from "react-router-dom";
import { Sparkles, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

const INCLUDED = [
  "Lifetime access — pay once, study forever",
  "All future updates included",
  "Native audio on every card",
  "Speaking, listening & quiz practice",
  "Smart spaced repetition",
  "Phone, tablet & desktop",
];

export function PricingSection({ config, ctaHref }: Props) {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-10">
          <div className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
            Today only — for {config.partnerName}'s students
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Your exclusive price
          </h2>
        </div>

        <div className="relative rounded-3xl bg-card border-2 border-primary/40 shadow-2xl overflow-hidden">
          {/* Glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-secondary/15 blur-3xl" />

          <div className="relative p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-secondary-foreground font-bold text-xs shadow-gold">
              <Sparkles className="w-3.5 h-3.5" />
              {config.discountLabel || "Exclusive"}
            </div>

            <div className="mt-6">
              <div className="text-sm text-muted-foreground">Regular price</div>
              <div className="text-2xl text-muted-foreground line-through">{formatPrice(config.oldPrice)}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Today</div>
              <div className="text-6xl md:text-7xl font-bold text-primary leading-none">
                {formatPrice(config.newPrice)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">One-time payment · Lifetime access</div>
            </div>

            {config.couponCode && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <ShieldCheck className="w-4 h-4" />
                Coupon{" "}
                <span className="font-mono font-bold bg-primary/15 px-2 py-0.5 rounded">
                  {config.couponCode}
                </span>{" "}
                already reserved
              </div>
            )}

            <div className="mt-8">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-semibold shadow-teal w-full sm:w-auto"
                asChild
              >
                <Link to={ctaHref}>
                  {config.ctaLabel}
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                No coupon code required — the discount is applied automatically at checkout.
              </p>
            </div>

            <ul className="mt-8 grid sm:grid-cols-2 gap-2.5 text-left max-w-md mx-auto">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Protected by a 30-day money-back guarantee.
        </p>
      </div>
    </section>
  );
}
