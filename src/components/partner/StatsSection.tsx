import { Globe2, BookOpen, Headphones, Infinity, Award, ShieldCheck, Star } from "lucide-react";
import type { PartnerStat } from "@/lib/partnerConfig";

interface Props {
  stats: PartnerStat[];
}

const ICONS = [Globe2, BookOpen, Headphones, Infinity, Award, ShieldCheck];

export function StatsSection({ stats }: Props) {
  return (
    <section className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="container mx-auto max-w-7xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" data-reveal>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat, index) => {
              const Icon = ICONS[index] ?? Star;
              return (
                <article
                  key={`${stat.value}-${stat.label}`}
                  className="group rounded-[1.5rem] border border-border/60 bg-card/88 p-5 shadow-[0_18px_50px_hsl(var(--foreground)/0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_hsl(var(--foreground)/0.1)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</div>
                      <div className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</div>
                    </div>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--accent))_0%,hsl(var(--background))_100%)] text-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="rounded-[1.75rem] border border-border/60 bg-card/92 p-5 shadow-[0_18px_50px_hsl(var(--foreground)/0.06)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Social proof</div>
                <div className="mt-2 text-4xl font-semibold tracking-tight text-foreground">4.9/5</div>
                <div className="mt-1 flex items-center gap-1 text-secondary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <div className="flex -space-x-3">
                {["H", "S", "A", "L", "M"].map((initial, index) => (
                  <span
                    key={initial}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-background bg-[linear-gradient(135deg,hsl(var(--accent))_0%,hsl(var(--secondary)/0.35)_100%)] text-sm font-semibold text-foreground"
                    style={{ zIndex: 10 - index }}
                  >
                    {initial}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Trusted by learners worldwide who want a premium Arabic study experience with real progress, not generic course videos.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
