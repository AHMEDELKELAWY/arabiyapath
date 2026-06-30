import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "I've finally started speaking Gulf Arabic confidently. The flashcards are addictive.",
    name: "Sarah K.",
    role: "Expat in Dubai",
  },
  {
    quote:
      "The native audio and realistic images made vocabulary click instantly. Best Arabic learning platform I've tried.",
    name: "Daniel R.",
    role: "Beginner learner",
  },
  {
    quote:
      "I look forward to my daily review. The streak keeps me going and I can feel myself improving every week.",
    name: "Aisha M.",
    role: "Working professional",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-muted/40 to-background" />
      <div className="absolute top-0 right-0 -z-10 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            Loved by learners
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
            What our students are saying
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={i}
              className="relative rounded-3xl border border-border bg-card p-7 md:p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <Quote className="absolute top-5 right-5 w-8 h-8 text-primary/15" />
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-foreground/90 leading-relaxed flex-1">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-border">
                <div className="font-bold text-foreground">{t.name}</div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
