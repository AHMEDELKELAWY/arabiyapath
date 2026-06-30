import { Volume2, Check, X, Trophy, TrendingUp, BookOpen } from "lucide-react";

interface ShotProps {
  side: "left" | "right";
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Showcase({ side, eyebrow, title, description, children }: ShotProps) {
  return (
    <div
      className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
        side === "right" ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-border p-6 md:p-8 shadow-xl">
        {children}
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">{eyebrow}</div>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h3>
        <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function PlatformShowcase() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Inside the course</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            See exactly what you're getting
          </h2>
        </div>

        <div className="space-y-20 md:space-y-28">
          {/* Flashcard study */}
          <Showcase
            side="left"
            eyebrow="Flashcard study"
            title="Beautiful, fully-vowelized cards"
            description="Every card pairs realistic imagery with native audio so meaning lands the first time. Spaced repetition keeps it locked in."
          >
            <div className="rounded-2xl bg-background border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Card 14 / 30</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= 3 ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-8 text-center">
                <div className="text-5xl md:text-6xl font-bold text-foreground mb-3" lang="ar" dir="rtl">
                  كِتَاب
                </div>
                <div className="text-base text-muted-foreground mb-2">kitāb</div>
                <div className="text-sm font-medium text-foreground">book</div>
                <button className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Volume2 className="w-4 h-4" /> Listen
                </button>
              </div>
            </div>
          </Showcase>

          {/* Quiz */}
          <Showcase
            side="right"
            eyebrow="Interactive quizzes"
            title="Test yourself the moment you're ready"
            description="Short quizzes after each unit reinforce what you've just learned, so progress actually compounds."
          >
            <div className="rounded-2xl bg-background border border-border p-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Question 3 / 10</div>
              <div className="text-base font-semibold text-foreground mb-4">
                What does <span className="text-primary" lang="ar" dir="rtl">شُكْرًا</span> mean?
              </div>
              <div className="space-y-2">
                {[
                  { t: "Thank you", correct: true },
                  { t: "Hello", correct: false },
                  { t: "Goodbye", correct: false },
                  { t: "Please", correct: false },
                ].map((o, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      o.correct
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        o.correct ? "bg-emerald-500 text-white" : "bg-muted"
                      }`}
                    >
                      {o.correct ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-muted-foreground/0" />}
                    </div>
                    <span className="text-sm">{o.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Showcase>

          {/* Dashboard */}
          <Showcase
            side="left"
            eyebrow="Your dashboard"
            title="Daily progress at a glance"
            description="Streaks, reviews due, and what to study next — everything you need to keep going, nothing you don't."
          >
            <div className="rounded-2xl bg-background border border-border p-6">
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl bg-primary/10 p-3 text-center">
                  <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold text-foreground">87%</div>
                  <div className="text-[10px] text-muted-foreground">Mastery</div>
                </div>
                <div className="rounded-xl bg-secondary/10 p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-secondary mx-auto mb-1" />
                  <div className="text-lg font-bold text-foreground">12</div>
                  <div className="text-[10px] text-muted-foreground">Day streak</div>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                  <BookOpen className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-foreground">340</div>
                  <div className="text-[10px] text-muted-foreground">Words known</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">This week</div>
                <div className="flex items-end gap-1.5 h-20">
                  {[40, 65, 50, 80, 70, 90, 60].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-primary/80 to-primary/40"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Showcase>
        </div>
      </div>
    </section>
  );
}
