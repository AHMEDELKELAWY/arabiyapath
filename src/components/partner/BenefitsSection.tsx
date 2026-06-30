import { BookOpen, Headphones, Mic, Sparkles, ArrowUpRight } from "lucide-react";
import type { PartnerModeCard } from "@/lib/partnerConfig";

interface Props {
  modeCards: PartnerModeCard[];
}

const ICONS = {
  learn: BookOpen,
  listening: Headphones,
  speaking: Mic,
  quiz: Sparkles,
};

const TAGS: Record<string, string> = {
  learn: "Vocabulary",
  listening: "Comprehension",
  speaking: "Pronunciation",
  quiz: "Recall",
};

export function BenefitsSection({ modeCards }: Props) {
  return (
    <section className="relative px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(152_42%_97%)_100%)]" />
      <div className="container mx-auto max-w-6xl" data-reveal>
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Four modes. One flow.
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
            Built like a product, not a textbook.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Every mode is designed around how memory actually works — see it, hear it, say it, recall it.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modeCards.map((card, index) => {
            const Icon = ICONS[card.icon];
            return (
              <article
                key={card.key}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-6 shadow-[0_12px_36px_hsl(var(--foreground)/0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_22px_60px_hsl(var(--primary)/0.12)]"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.16),transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    0{index + 1}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <div className="mt-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--accent))_0%,hsl(var(--background))_100%)] text-primary shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {TAGS[card.key]}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
