import { BookOpen, Headphones, Mic, Sparkles } from "lucide-react";
import type { PartnerModeCard } from "@/lib/partnerConfig";
import heroAsset from "@/assets/partner/partner-hero.png.asset.json";

interface Props {
  modeCards: PartnerModeCard[];
}

const ICONS = {
  learn: BookOpen,
  listening: Headphones,
  speaking: Mic,
  quiz: Sparkles,
};

export function BenefitsSection({ modeCards }: Props) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="container mx-auto max-w-7xl" data-reveal>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-8">
          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent))_0%,transparent_28%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.35)_100%)] p-3 shadow-[0_24px_70px_hsl(var(--foreground)/0.08)]">
            <img
              src={heroAsset.url}
              alt="ArabiyaPath learning modes overview"
              className="w-full rounded-[1.5rem] object-cover"
              loading="lazy"
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Learning modes overview
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One premium system. Four ways to learn.
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
              Move naturally between learning, listening, speaking, and quiz practice without leaving the same polished study flow.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {modeCards.map((card) => {
                const Icon = ICONS[card.icon];
                return (
                  <article
                    key={card.key}
                    className="group rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-[0_16px_40px_hsl(var(--foreground)/0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_22px_54px_hsl(var(--foreground)/0.08)]"
                  >
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--accent))_0%,hsl(var(--background))_100%)] text-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-foreground">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{card.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
