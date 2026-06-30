import type { PartnerStat } from "@/lib/partnerConfig";

interface Props {
  stats: PartnerStat[];
}

export function StatsSection({ stats }: Props) {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="rounded-3xl bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-border p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="mt-2 text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
