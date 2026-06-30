import { BarChart3, Flame, Trophy, Calendar, TrendingUp, Sparkles } from "lucide-react";

const dashboardImageUrl = "/partner/dashboard.png";

interface Props {
  highlights: string[];
}

const METRICS = [
  { icon: Flame, label: "Streak", value: "14 days", tone: "from-orange-500/15 to-amber-400/10", iconClass: "text-orange-500" },
  { icon: Trophy, label: "Mastered", value: "327 cards", tone: "from-emerald-500/15 to-emerald-400/10", iconClass: "text-emerald-600" },
  { icon: TrendingUp, label: "This week", value: "+18%", tone: "from-primary/15 to-primary/5", iconClass: "text-primary" },
  { icon: Calendar, label: "Daily review", value: "12 due", tone: "from-secondary/20 to-secondary/5", iconClass: "text-secondary" },
];

export function HowItWorks({ highlights: _highlights }: Props) {
  return (
    <section className="relative px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--accent))_0%,transparent_28%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(152_44%_97%)_100%)]" />
      <div className="container mx-auto max-w-6xl" data-reveal>
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <BarChart3 className="h-3.5 w-3.5" />
            Your dashboard
          </div>
          <h2 className="mt-5 text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem]">
            Progress you can <span className="text-primary">actually see.</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Daily reviews, mastered cards, and weekly streaks — a calm, honest view of how fast your Arabic is compounding.
          </p>
        </div>

        <div className="relative mt-12">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.14),transparent_65%)] blur-3xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/95 p-3 shadow-[0_30px_80px_hsl(var(--foreground)/0.1)] backdrop-blur-md">
            <img
              src={dashboardImageUrl}
              alt="ArabiyaPath progress dashboard"
              className="w-full rounded-[1.4rem] object-cover"
              loading="lazy"
            />
          </div>

          {/* Floating metric cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:absolute lg:-bottom-8 lg:left-1/2 lg:mt-0 lg:w-[88%] lg:-translate-x-1/2 lg:grid-cols-4">
            {METRICS.map(({ icon: Icon, label, value, tone, iconClass }, i) => (
              <div
                key={label}
                className={`group rounded-2xl border border-border/60 bg-background/95 p-4 shadow-[0_18px_46px_hsl(var(--foreground)/0.1)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-1`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}>
                    <Icon className={`h-4 w-4 ${iconClass}`} />
                  </span>
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-0 lg:h-16" />
      </div>
    </section>
  );
}
