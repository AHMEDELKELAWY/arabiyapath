import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

export function FinalCTA({ config, ctaHref }: Props) {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-secondary/40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-primary-foreground text-xs font-bold backdrop-blur">
          <Sparkles className="w-3.5 h-3.5" />
          Your exclusive 50% discount is waiting
        </div>

        <h2 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground leading-[1.05]">
          Ready to continue your Arabic journey?
        </h2>

        <p className="mt-5 text-lg text-primary-foreground/85 max-w-xl mx-auto">
          Join {config.partnerName}'s students and unlock lifetime access for just{" "}
          <span className="font-bold text-primary-foreground">{formatPrice(config.newPrice)}</span>.
        </p>

        <div className="mt-9">
          <Button
            size="lg"
            variant="secondary"
            className="h-14 px-8 text-base font-semibold shadow-2xl hover:scale-[1.03] transition-transform"
            asChild
          >
            <Link to={ctaHref}>
              {config.ctaLabel}
              <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
          </Button>
          <p className="text-xs text-primary-foreground/70 mt-4">
            No coupon code required. Discount applied automatically. 30-day money-back guarantee.
          </p>
        </div>
      </div>
    </section>
  );
}
