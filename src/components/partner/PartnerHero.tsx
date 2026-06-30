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
  "30-day money-back guarantee",
];

export function PartnerHero({ config, ctaHref }: Props) {
  return (
    <section className="relative overflow-hidden">
      {/* Premium layered background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.06] via-background to-background" />
      <div className="absolute -top-32 -right-20 -z-10 w-[700px] h-[700px] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute top-1/3 -left-32 -z-10 w-[600px] h-[600px] rounded-full bg-secondary/15 blur-[120px]" />
      <div className="absolute -bottom-32 left-1/3 -z-10 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 lg:gap-20 items-center">
          {/* Left */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/70 backdrop-blur-xl border border-secondary/40 text-foreground text-xs font-bold tracking-wide shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              {config.badge}
            </div>

            <h1 className="mt-6 text-[2.6rem] leading-[1.02] sm:text-5xl lg:text-[4rem] lg:leading-[1.02] font-bold tracking-tight text-foreground">
              {config.headline}
            </h1>

            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-xl leading-relaxed">
              {config.subheadline}
            </p>

            <div className="mt-8 flex items-end gap-6">
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
                <div className="text-6xl sm:text-7xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent leading-none">
                  {formatPrice(config.newPrice)}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Button
                asChild
                className="group relative h-[60px] sm:h-[64px] px-10 rounded-[18px] text-[20px] sm:text-[22px] font-bold shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.55)] hover:shadow-[0_22px_55px_-12px_hsl(var(--primary)/0.7)] hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 bg-gradient-to-br from-primary to-primary/90"
              >
                <Link to={ctaHref}>
                  <span className="absolute inset-0 rounded-[18px] bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative">{config.ctaLabel}</span>
                  <ArrowRight className="relative w-6 h-6 ml-1 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </Button>
            </div>

            <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 max-w-md">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — dominant product shot */}
          <div className="animate-scale-in">
            <HeroCollage />
          </div>
        </div>
      </div>
    </section>
  );
}
