import { Check, BookOpen, GraduationCap, Trophy, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LevelPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  levelName?: string;
}

interface BundlePlan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
}

interface DialectPricingSectionProps {
  dialectName: string;
  dialectEmoji: string;
  accentColor: string;
  levels: LevelPlan[];
  bundle: BundlePlan | null;
  onSelectLevel: (plan: LevelPlan) => void;
  onSelectBundle: (plan: BundlePlan) => void;
}

const levelIcons: Record<string, typeof BookOpen> = {
  Beginner: BookOpen,
  Intermediate: GraduationCap,
  Advanced: Trophy,
};

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
  Beginner: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30 hover:border-emerald-500/50",
  },
  Intermediate: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30 hover:border-blue-500/50",
  },
  Advanced: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30 hover:border-purple-500/50",
  },
};

export function DialectPricingSection({
  dialectName,
  dialectEmoji,
  accentColor,
  levels,
  bundle,
  onSelectLevel,
  onSelectBundle,
}: DialectPricingSectionProps) {
  const totalLevelPrice = levels.reduce((sum, l) => sum + l.price, 0);
  const bundleSavings = bundle ? totalLevelPrice - bundle.price : 0;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-muted mb-4">
          <span className="text-2xl">{dialectEmoji}</span>
          <h2 className="text-xl font-bold text-foreground">{dialectName}</h2>
        </div>
        <p className="text-muted-foreground">
          Choose a single level or save with the complete bundle
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Level Cards */}
        {levels.map((level) => {
          const Icon = levelIcons[level.levelName] || BookOpen;
          const colors = levelColors[level.levelName] || levelColors.Beginner;

          return (
            <div
              key={level.id}
              className={cn(
                "relative bg-card rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg",
                colors.border
              )}
            >
              <div className="text-center mb-5">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3", colors.bg)}>
                  <Icon className={cn("w-6 h-6", colors.text)} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{level.levelName}</h3>
                <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
              </div>

              <div className="text-center mb-5">
                <span className="text-3xl font-bold text-foreground">${level.price}</span>
                <span className="text-muted-foreground text-sm"> /one-time</span>
              </div>

              <ul className="space-y-2.5 mb-5">
                {level.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onSelectLevel(level)}
              >
                Get {level.levelName}
              </Button>
            </div>
          );
        })}

        {/* Bundle Card */}
        {bundle && (
          <div className="relative bg-card rounded-2xl border-2 border-secondary p-6 shadow-gold transition-all duration-300 hover:shadow-xl">
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                <Sparkles className="w-3 h-3" />
                SAVE ${bundleSavings.toFixed(0)}
              </div>
            </div>

            <div className="text-center mb-5 pt-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-secondary/20">
                <Package className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{bundle.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">All 3 levels included</p>
            </div>

            <div className="text-center mb-5">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-lg text-muted-foreground line-through">${totalLevelPrice.toFixed(0)}</span>
                <span className="text-3xl font-bold text-foreground">${bundle.price}</span>
              </div>
              <span className="text-muted-foreground text-sm"> /one-time</span>
            </div>

            <ul className="space-y-2.5 mb-5">
              {bundle.features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={() => onSelectBundle(bundle)}
            >
              Get Bundle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
