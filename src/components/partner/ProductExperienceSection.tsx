import onroadAsset from "@/assets/partner/onroad-modes.jpg.asset.json";
import { BookOpen, Headphones, Mic, GraduationCap } from "lucide-react";

const MODES = [
  { icon: BookOpen, label: "Learn", desc: "Image + native audio" },
  { icon: Headphones, label: "Listening", desc: "Train your ear" },
  { icon: Mic, label: "Speaking", desc: "Record yourself" },
  { icon: GraduationCap, label: "Test Yourself", desc: "Smart quizzes" },
];

export function ProductExperienceSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            How you'll learn
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
            Four learning modes, one fluent you
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Each unit comes with four interactive modes — so you read, hear, speak and review every word until it sticks.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
          {/* Real screenshot */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-primary/25 to-secondary/15 blur-3xl rounded-[40%]" />
            <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-2xl mx-auto max-w-[480px]">
              <img
                src={onroadAsset.url}
                alt="A unit's four learning modes with a sample flashcard"
                loading="lazy"
                className="block w-full h-auto"
              />
            </div>
          </div>

          {/* Mode grid */}
          <div className="grid grid-cols-2 gap-4">
            {MODES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="font-bold text-foreground">{label}</div>
                <div className="text-sm text-muted-foreground mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
