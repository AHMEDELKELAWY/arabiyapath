import {
  Mic,
  Brain,
  Headphones,
  Image as ImageIcon,
  TrendingUp,
  Repeat,
  ClipboardCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { PartnerBenefit } from "@/lib/partnerConfig";

const ICONS: Record<PartnerBenefit["icon"], LucideIcon> = {
  speak: Mic,
  memory: Brain,
  audio: Headphones,
  image: ImageIcon,
  progress: TrendingUp,
  srs: Repeat,
  quiz: ClipboardCheck,
  mobile: Smartphone,
};

interface Props {
  benefits: PartnerBenefit[];
}

export function BenefitsSection({ benefits }: Props) {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            What you get
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Real outcomes, not just features
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Built for daily progress, designed for native fluency.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((b) => {
            const Icon = ICONS[b.icon] || Brain;
            return (
              <div
                key={b.title}
                className="group bg-card border border-border rounded-2xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/40"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
