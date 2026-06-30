import { Award, BriefcaseBusiness, CheckCircle2, Sparkles } from "lucide-react";

const certificateImageUrl = "/partner/certificate.png";

export function PartnerCertificate() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
      <div className="container mx-auto max-w-7xl" data-reveal>
        <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary)/0.15),transparent_18%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(152_46%_97%)_100%)] p-6 shadow-[0_28px_80px_hsl(var(--foreground)/0.08)] lg:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:gap-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary">
                <Award className="h-4 w-4" />
                Certificate
              </div>
              <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl">
                Finish the course. Get certified.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                Celebrate the work you put in with a premium completion certificate you can download, share on LinkedIn, and use to showcase your progress.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Recognized Certificate", description: "A polished reward that feels worth earning.", icon: CheckCircle2 },
                  { title: "Boost your CV", description: "Show commitment and measurable progress.", icon: BriefcaseBusiness },
                  { title: "Share your achievement", description: "Celebrate publicly when you finish the journey.", icon: Sparkles },
                ].map(({ title, description, icon: Icon }) => (
                  <article key={title} className="rounded-[1.5rem] border border-border/60 bg-card/88 p-5 shadow-[0_16px_40px_hsl(var(--foreground)/0.05)]">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--secondary)/0.18)_0%,hsl(var(--background))_100%)] text-secondary-foreground">
                      <Icon className="h-5 w-5 text-secondary" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/90 p-3 shadow-[0_28px_80px_hsl(var(--foreground)/0.08)]">
              <img src={certificateImageUrl} alt="ArabiyaPath certificate preview" className="w-full rounded-[1.5rem] object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
