import { Volume2, Check, Flame, Star } from "lucide-react";

/**
 * Realistic ArabiyaPath product mockup — composed from real UI fragments,
 * not a generic illustration. Pure CSS/SVG, animates subtly on the hero.
 */
export function ProductMockup() {
  return (
    <div className="relative w-full aspect-[5/5] md:aspect-[6/5]">
      {/* Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      {/* Laptop frame */}
      <div className="absolute inset-x-0 top-4 mx-auto w-[88%] rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-1.5 shadow-2xl ring-1 ring-white/10">
        <div className="rounded-xl bg-background overflow-hidden">
          {/* Browser bar */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-b border-border/50">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="ml-3 flex-1 h-5 rounded bg-background/80 text-[10px] text-muted-foreground flex items-center px-2">
              arabiyapath.com / flashcards
            </div>
          </div>
          {/* Flashcard surface */}
          <div className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Unit 3 · Greetings</span>
              <span className="text-[10px] text-muted-foreground">12 / 20</span>
            </div>
            <div className="rounded-xl bg-card border border-border shadow-md p-5 text-center">
              <div className="text-4xl sm:text-5xl font-bold text-foreground mb-2 [font-feature-settings:'kern'] tracking-wide" lang="ar" dir="rtl">
                مَرْحَبًا
              </div>
              <div className="text-sm text-muted-foreground mb-3">marhaban</div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Volume2 className="w-3 h-3" /> Native audio
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-primary to-primary/70" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating phone */}
      <div className="absolute -bottom-2 -left-2 sm:left-0 w-[36%] rotate-[-6deg] rounded-[1.5rem] bg-slate-900 p-1 shadow-2xl ring-1 ring-white/10 animate-fade-in">
        <div className="rounded-[1.2rem] bg-background overflow-hidden aspect-[9/16]">
          <div className="h-6 bg-slate-900" />
          <div className="p-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Today</div>
            <div className="text-sm font-bold text-foreground mb-3">Daily review</div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="h-1.5 rounded bg-muted w-3/4" />
                    <div className="h-1 rounded bg-muted/60 w-1/2 mt-1" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1 text-[10px] text-secondary font-semibold">
              <Flame className="w-3 h-3" /> 7-day streak
            </div>
          </div>
        </div>
      </div>

      {/* Floating progress card */}
      <div className="absolute top-2 -right-1 sm:right-0 w-[40%] rotate-[5deg] rounded-2xl bg-card border border-border shadow-xl p-3 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
          <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
        </div>
        <div className="text-2xl font-bold text-foreground">87%</div>
        <div className="text-[10px] text-muted-foreground mb-2">Mastered this week</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-6 rounded ${i < 5 ? "bg-primary" : i < 6 ? "bg-primary/60" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
