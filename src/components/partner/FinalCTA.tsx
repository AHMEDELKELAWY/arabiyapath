import { Link } from "react-router-dom";
import { ArrowRight, Award, Headphones, Infinity, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";

const heroImageUrl = "/partner/hero.png";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

const ITEMS = [
  { label: "Lifetime access", icon: Infinity },
  { label: "Native audio", icon: Headphones },
  { label: "Certificate included", icon: Award },
  { label: "30-day guarantee", icon: ShieldCheck },
];

export function FinalCTA({ config, ctaHref }: Props) {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
      <div className="container mx-auto max-w-7xl" data-reveal>
        <div className="overflow-hidden rounded-[2rem] border border-border/20 bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary)/0.16),transparent_20%),linear-gradient(135deg,hsl(165_88%_9%)_0%,hsl(162_80%_11%)_35%,hsl(152_66%_14%)_66%,hsl(152_52%_11%)_100%)] p-6 shadow-[0_32px_90px_hsl(var(--foreground)/0.1)] lg:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
            <div className="text-primary-foreground">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/12 bg-background/8 px-4 py-2 text-sm font-semibold backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-secondary" />
                Private invitation for {config.partnerName}'s students
              </div>
              <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">
                This looks like a premium product because it is one.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-primary-foreground/78">
                Unlock the full flashcards experience today for <span className="font-semibold text-secondary">{formatPrice(config.newPrice)}</span> and start inside your progress dashboard immediately after purchase.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {ITEMS.map(({ label, icon: Icon }) => (
                  <div key={label} className="inline-flex items-center gap-3 rounded-2xl border border-primary-foreground/10 bg-background/8 px-4 py-3 backdrop-blur-md">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/12 text-secondary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-primary-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="xl" className="partner-cta group rounded-full px-8">
                  <Link to={ctaHref}>
                    {config.ctaLabel}
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <div className="text-sm text-primary-foreground/72">No coupon code required. Existing checkout stays exactly the same.</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-primary-foreground/10 bg-background/8 p-3 backdrop-blur-md">
              <img
                src={heroImageUrl}
                alt="Premium ArabiyaPath partner artwork reused in the final call to action"
                className="w-full rounded-[1.5rem] object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
