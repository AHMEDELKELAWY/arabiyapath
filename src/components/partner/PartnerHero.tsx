import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCollage } from "./HeroCollage";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

const TRUST = [
  "Coupon already reserved",
  "Lifetime access",
  "Native audio included",
  "Trusted by learners worldwide",
];

export function PartnerHero({ config, ctaHref }: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute -top-20 right-0 -z-10 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 -z-10 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 md:pt-16 md:pb-28">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
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

            <div className="mt-7 flex items-end gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Regular
                </div>
                <div className="text-xl text-muted-foreground line-through">
                  {formatPrice(config.oldPrice)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Your price today
                </div>
                <div className="text-5xl sm:text-6xl font-bold text-primary leading-none">
                  {formatPrice(config.newPrice)}
                </div>
              </div>
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
            </div>

            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 max-w-md">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — real product collage */}
          <div className="animate-scale-in">
            <HeroCollage />
          </div>
        </div>
      </div>
    </section>
  );
}
