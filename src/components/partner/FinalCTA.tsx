import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Headphones, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";
import learnAsset from "@/assets/partner/learn-bus.jpg.asset.json";
import speakingAsset from "@/assets/partner/speaking.jpg.asset.json";
import quizAsset from "@/assets/partner/quiz-traffic.jpg.asset.json";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

const TRUST = [
  { icon: ShieldCheck, label: "30-day guarantee" },
  { icon: InfinityIcon, label: "Lifetime access" },
  { icon: Headphones, label: "Native audio" },
];

export function FinalCTA({ config, ctaHref }: Props) {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-secondary/40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-white/15 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-14 items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-primary-foreground text-xs font-bold backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" />
              Your exclusive {config.discountLabel || "50% OFF"} is waiting
            </div>

            <h2 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground leading-[1.05]">
              Ready to start your Arabic journey?
            </h2>

            <p className="mt-5 text-lg text-primary-foreground/85 max-w-xl mx-auto lg:mx-0">
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
                No coupon code required · Discount applied automatically · 30-day money-back guarantee
              </p>
            </div>

            <ul className="mt-7 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2">
              {TRUST.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 text-sm text-primary-foreground/90"
                >
                  <Icon className="w-4 h-4" /> {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Mini collage */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-square max-w-[380px] mx-auto">
              <div className="absolute top-0 right-0 w-[70%] rounded-2xl overflow-hidden border border-white/20 shadow-2xl rotate-[4deg]">
                <img src={learnAsset.url} alt="" loading="lazy" className="block w-full h-auto" />
              </div>
              <div className="absolute bottom-0 left-0 w-[60%] rounded-2xl overflow-hidden border border-white/20 shadow-2xl -rotate-[5deg]">
                <img src={speakingAsset.url} alt="" loading="lazy" className="block w-full h-auto" />
              </div>
              <div className="absolute bottom-[8%] right-[4%] w-[48%] rounded-xl overflow-hidden border border-white/20 shadow-xl rotate-[2deg]">
                <img src={quizAsset.url} alt="" loading="lazy" className="block w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
