import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductMockup } from "./ProductMockup";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

export function PartnerHero({ config, ctaHref }: Props) {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute -top-20 right-0 -z-10 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 -z-10 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-12 items-center">
          {/* Left */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/15 border border-secondary/30 text-secondary-foreground/90 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              {config.badge}
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
              {config.headline}
            </h1>

            <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
              {config.subheadline}
            </p>

            {/* Price stack */}
            <div className="mt-7 inline-flex items-end gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Regular</div>
                <div className="text-xl text-muted-foreground line-through">{formatPrice(config.oldPrice)}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Your price today</div>
                <div className="text-5xl font-bold text-primary leading-none">{formatPrice(config.newPrice)}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Lifetime access
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Coupon already reserved
              </span>
            </div>

            <div className="mt-7">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-semibold shadow-teal hover:scale-[1.02] transition-transform"
                asChild
              >
                <Link to={ctaHref}>
                  {config.ctaLabel}
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-3 max-w-sm">{config.ctaNote}</p>
            </div>
          </div>

          {/* Right */}
          <div className="animate-scale-in">
            <ProductMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
