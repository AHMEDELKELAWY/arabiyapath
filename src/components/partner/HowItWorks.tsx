import { BarChart3, BookCheck, Flame, GraduationCap, LayoutGrid, Sparkles } from "lucide-react";

const dashboardImageUrl = "/partner/dashboard.png";

interface Props {
  highlights: string[];
}

const ICONS = [BarChart3, LayoutGrid, BookCheck, Sparkles, Flame, GraduationCap];

export function HowItWorks({ highlights }: Props) {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
      <div className="container mx-auto max-w-7xl" data-reveal>
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary">
              07 · Your Progress
            </div>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl">
              Your journey. <span className="text-primary">Your progress.</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Track what you learned, celebrate wins, and stay motivated with a dashboard that makes progress visible from day one.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {highlights.map((item, index) => {
                const Icon = ICONS[index] ?? Sparkles;
                return (
                  <article
                    key={item}
                    className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-[0_16px_40px_hsl(var(--foreground)/0.05)]"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{item}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Clean analytics and daily visibility help students keep going without friction.
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/90 p-3 shadow-[0_28px_80px_hsl(var(--foreground)/0.08)]">
            <img
              src={dashboardImageUrl}
              alt="Progress dashboard showing mastery, streak, analytics, and study activity"
              className="w-full rounded-[1.5rem] object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
