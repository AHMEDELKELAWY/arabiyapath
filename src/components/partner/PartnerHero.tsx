import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, BadgeCheck, Headphones, Infinity, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerLandingConfig } from "@/lib/partnerConfig";
import { formatPrice } from "@/lib/partnerConfig";
import heroAsset from "@/assets/partner/partner-hero.png.asset.json";

interface Props {
  config: PartnerLandingConfig;
  ctaHref: string;
}

const TRUST_ITEMS = [
  { label: "Lifetime Access", icon: Infinity },
  { label: "Native Audio", icon: Headphones },
  { label: "Speaking Practice", icon: Mic },
  { label: "Certificate", icon: Award },
  { label: "30-Day Guarantee", icon: ShieldCheck },
];

export function PartnerHero({ config, ctaHref }: Props) {
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
    setOffset({ x, y });
  };

  const handleLeave = () => setOffset({ x: 0, y: 0 });

  return (
    <section className="relative overflow-hidden px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--secondary)/0.18),transparent_18%),radial-gradient(circle_at_80%_20%,hsl(var(--secondary)/0.12),transparent_14%),linear-gradient(135deg,hsl(165_88%_9%)_0%,hsl(162_80%_11%)_35%,hsl(152_66%_14%)_66%,hsl(152_52%_11%)_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(hsl(var(--border)/0.24)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.24),transparent_60%)] blur-2xl" />
      <div className="absolute left-1/2 top-[18%] -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--secondary)/0.28),transparent_62%)] blur-3xl" />

      <div className="container mx-auto max-w-7xl">
        <div className="grid gap-8 rounded-[2rem] border border-border/20 bg-background/0 pb-10 pt-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-10 lg:px-2 lg:pb-12 lg:pt-12">
          <div className="relative z-10 max-w-xl text-primary-foreground" data-reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-background/5 px-4 py-2 text-sm font-semibold backdrop-blur-md">
              <BadgeCheck className="h-4 w-4 text-secondary" />
              {config.badge}
            </div>

            <h1 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-tight sm:text-5xl lg:text-7xl">
              {config.headline}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-primary-foreground/78 sm:text-xl">
              {config.subheadline}
            </p>

            <div className="mt-7 flex flex-wrap items-end gap-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/55">Regular price</div>
                <div className="mt-2 text-3xl text-primary-foreground/45 line-through">{formatPrice(config.oldPrice)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">Your price today</div>
                <div className="mt-2 text-5xl font-semibold leading-none text-secondary sm:text-6xl">{formatPrice(config.newPrice)}</div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="xl"
                className="partner-cta group h-16 min-w-[260px] rounded-full border border-secondary/20 bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--gold-light))_100%)] px-8 text-lg font-semibold text-secondary-foreground shadow-gold hover:scale-[1.02]"
              >
                <Link to={ctaHref}>
                  {config.ctaLabel}
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <div className="text-sm text-primary-foreground/72">{config.ctaNote}</div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-primary-foreground/84 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-3">
              {TRUST_ITEMS.map(({ label, icon: Icon }) => (
                <div key={label} className="inline-flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/10 bg-background/10 backdrop-blur-md">
                    <Icon className="h-4 w-4 text-secondary" />
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative mx-auto w-full max-w-3xl"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            data-reveal
          >
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_45%,hsl(var(--secondary)/0.3),transparent_42%)] blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-[52%] h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-secondary/20" />
            <div className="pointer-events-none absolute left-1/2 top-[52%] h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-secondary/15" />
            <div
              className="relative overflow-hidden rounded-[2rem] border border-border/15 bg-background/5 shadow-2xl backdrop-blur-md transition-transform duration-300"
              style={{
                transform: reducedMotion ? undefined : `perspective(1200px) rotateX(${-offset.y / 3}deg) rotateY(${offset.x / 3}deg) translate3d(${offset.x / 3}px, ${offset.y / 3}px, 0)`,
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background)/0.02)_100%)]" />
              <img
                src={heroAsset.url}
                alt="Premium Houria partner offer preview showing flashcards, listening, speaking, quiz, and dashboard experiences"
                className="h-full w-full object-cover object-right-top"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
