import { Sparkles, Check, Crown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
}

interface AllAccessHeroProps {
  plan: Plan;
  totalLevelPrice: number;
  onSelect: () => void;
}

export function AllAccessHero({ plan, totalLevelPrice, onSelect }: AllAccessHeroProps) {
  const savings = totalLevelPrice - plan.price;
  const savingsPercent = Math.round((savings / totalLevelPrice) * 100);

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-3xl blur-lg opacity-30 animate-pulse" />
      
      <div className="relative bg-card rounded-3xl border-2 border-primary p-8 md:p-10 shadow-xl overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 pattern-overlay opacity-50" />
        
        {/* Best Value Badge */}
        <div className="absolute -top-px left-1/2 -translate-x-1/2">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-b-2xl bg-secondary text-secondary-foreground font-bold shadow-gold">
            <Crown className="w-5 h-5" />
            <span>BEST VALUE</span>
            <Crown className="w-5 h-5" />
          </div>
        </div>

        <div className="relative z-10 grid md:grid-cols-2 gap-8 pt-6">
          {/* Left side - Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-teal">
                <Globe className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">{plan.name}</h2>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>
            </div>

            <ul className="grid gap-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right side - Pricing & CTA */}
          <div className="flex flex-col items-center justify-center text-center space-y-6 bg-muted/30 rounded-2xl p-6 md:p-8">
            {/* Anchor pricing */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total value if bought separately</p>
              <p className="text-2xl text-muted-foreground line-through">${totalLevelPrice.toFixed(2)}</p>
            </div>

            {/* Current price */}
            <div>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl md:text-6xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground">/one-time</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">
                <Sparkles className="w-4 h-4" />
                Save ${savings.toFixed(2)} ({savingsPercent}% off)
              </div>
            </div>

            <Button
              size="lg"
              className="w-full max-w-xs text-lg h-14 shadow-teal hover:shadow-xl transition-all duration-300"
              onClick={onSelect}
            >
              Get Full Access
            </Button>

            <p className="text-xs text-muted-foreground">
              ✓ Instant access · ✓ 30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
