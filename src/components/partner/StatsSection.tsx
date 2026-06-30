import type { PartnerStat } from "@/lib/partnerConfig";

interface Props {
  stats: PartnerStat[];
}

export function StatsSection({ stats }: Props) {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            What's inside
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            A complete Arabic learning system
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group relative rounded-2xl border border-border bg-card p-6 md:p-7 text-center shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent leading-none">
                {s.value}
              </div>
              <div className="relative mt-3 text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
