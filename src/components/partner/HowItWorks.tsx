const STEPS = [
  { n: "1", t: "Open your invitation", d: "You're already here — your discount is reserved." },
  { n: "2", t: "Create your account", d: "Under a minute. Your coupon stays applied automatically." },
  { n: "3", t: "Start learning immediately", d: "Lifetime access on phone, tablet, and desktop." },
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="text-center mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Getting started</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Three steps. That's it.
          </h2>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-primary/30 via-primary/30 to-primary/30" />

          {STEPS.map((s) => (
            <div key={s.n} className="relative text-center">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-5 shadow-teal">
                {s.n}
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
