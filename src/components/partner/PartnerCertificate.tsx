import { Award, BadgeCheck, Linkedin, ShieldCheck, Sparkles } from "lucide-react";

const certificateImageUrl = "/partner/certificate.png";

const PERKS = [
  { icon: BadgeCheck, label: "Verifiable", value: "Unique link" },
  { icon: Linkedin, label: "LinkedIn-ready", value: "One-tap share" },
  { icon: ShieldCheck, label: "Lifetime", value: "Never expires" },
];

export function PartnerCertificate() {
  return (
    <section className="relative px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(42_88%_82%/0.55),transparent_28%),radial-gradient(circle_at_bottom_right,hsl(45_92%_88%/0.45),transparent_30%),linear-gradient(180deg,hsl(44_70%_98%)_0%,hsl(42_55%_96%)_100%)]" />
      <div className="container mx-auto max-w-6xl" data-reveal>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
              <Award className="h-3.5 w-3.5" />
              Recognition
            </div>
            <h2 className="mt-5 text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem]">
              Proof you put in <span className="bg-gradient-to-r from-secondary to-amber-500 bg-clip-text text-transparent">the work.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Finish the pack and unlock a verifiable completion certificate — designed to look at home on LinkedIn, in a portfolio, or printed and framed.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {PERKS.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border/60 bg-card/90 p-4 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-secondary/25 to-amber-300/15 text-secondary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex items-center gap-3 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span>Awarded the moment you complete every unit.</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_center,hsl(42_92%_70%/0.35),transparent_60%)] blur-3xl" />
            <div className="relative rotate-[-1.5deg] overflow-hidden rounded-[1.5rem] border border-secondary/20 bg-card p-2 shadow-[0_30px_80px_hsl(42_50%_30%/0.18)] transition-transform duration-500 hover:rotate-0">
              <img src={certificateImageUrl} alt="Completion certificate" className="w-full rounded-[1.2rem] object-cover" loading="lazy" />
            </div>
            <div className="absolute -bottom-4 left-6 hidden items-center gap-2 rounded-full border border-secondary/30 bg-background/95 px-4 py-2 text-xs font-semibold text-secondary shadow-[0_14px_36px_hsl(42_50%_30%/0.18)] sm:inline-flex">
              <BadgeCheck className="h-4 w-4" />
              Verified by ArabiyaPath
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
