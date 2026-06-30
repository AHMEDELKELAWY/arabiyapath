import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Check, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

export function PricingSection({ config, ctaHref }: Props) {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
      <div className="container mx-auto max-w-5xl" data-reveal>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Premium pricing
          </div>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Get premium access for a partner-only price.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Everything stays exactly in the same secure checkout flow — this section only makes the value impossible to miss.
          </p>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-primary/25 bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.12),transparent_20%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.3)_100%)] p-[1px] shadow-[0_30px_90px_hsl(var(--foreground)/0.09)]">
          <div className="absolute inset-0 animate-pulse rounded-[2rem] border border-secondary/30" />
          <div className="relative rounded-[calc(2rem-1px)] bg-card/95 p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary/14 px-4 py-2 text-sm font-semibold text-secondary-foreground">
                  <BadgeCheck className="h-4 w-4 text-secondary" />
                  {config.discountLabel || "Exclusive offer"}
                </div>
                <div className="mt-6 flex flex-wrap items-end gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Regular</div>
                    <div className="mt-2 text-3xl text-muted-foreground line-through">{formatPrice(config.oldPrice)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Today</div>
                    <div className="mt-2 text-6xl font-semibold leading-none text-foreground sm:text-7xl">{formatPrice(config.newPrice)}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-primary">
                    <ShieldCheck className="h-4 w-4" /> 30-day money-back guarantee
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-primary">
                    <LockKeyhole className="h-4 w-4" /> Secure checkout
                  </span>
                </div>
                {config.couponCode && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
                    Coupon <span className="font-mono font-semibold">{config.couponCode}</span> already reserved
                  </div>
                )}
              </div>

              <div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {config.pricingIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-primary">
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button asChild size="xl" className="partner-cta group rounded-full px-8">
                    <Link to={ctaHref}>
                      {config.ctaLabel}
                      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <div className="text-sm text-muted-foreground">Pay once · Keep access forever · Discount auto-applied</div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">PayPal-supported checkout · no logic changes to the existing purchase flow.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
