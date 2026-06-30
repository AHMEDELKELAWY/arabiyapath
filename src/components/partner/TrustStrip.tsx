import { Star, Headphones, Infinity as InfinityIcon, Zap, Globe2 } from "lucide-react";

const ITEMS = [
  {
    icon: Star,
    label: "Trusted by learners worldwide",
    accent: "text-amber-500",
    stars: true,
  },
  { icon: Globe2, label: "3,000+ flashcards", accent: "text-primary" },
  { icon: Headphones, label: "Native audio", accent: "text-secondary" },
  { icon: InfinityIcon, label: "Lifetime access", accent: "text-primary" },
  { icon: Zap, label: "Instant delivery", accent: "text-secondary" },
];

export function TrustStrip() {
  return (
    <section className="relative -mt-8 md:-mt-12 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="rounded-2xl md:rounded-3xl border border-border bg-card/70 backdrop-blur-xl shadow-xl px-4 py-5 md:px-8 md:py-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
            {ITEMS.map(({ icon: Icon, label, accent, stars }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 text-sm md:text-[15px] font-semibold text-foreground/85"
              >
                {stars ? (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 fill-current ${accent}`} />
                    ))}
                  </span>
                ) : (
                  <Icon className={`w-4 h-4 ${accent}`} />
                )}
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
