import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  MEMBERSHIP_PLANS,
  PRODUCT_NAME,
  resolveMembershipHref,
  type MembershipPlan,
} from "@/lib/membershipPlans";

interface MembershipPricingSectionProps {
  heading?: string;
  subheading?: string;
  className?: string;
}

export function MembershipPricingSection({
  heading = "Choose your Membership",
  subheading = `Unlimited access to ${PRODUCT_NAME}. Start free — upgrade anytime.`,
  className,
}: MembershipPricingSectionProps) {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <section className={cn("py-16 md:py-20", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {heading}
          </h2>
          <p className="text-lg text-muted-foreground">{subheading}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto items-stretch">
          {MEMBERSHIP_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          30-day money-back guarantee · Secure payments · Cancel anytime
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan, isLoggedIn }: { plan: MembershipPlan; isLoggedIn: boolean }) {
  const href = resolveMembershipHref(plan, isLoggedIn);
  const highlighted = !!plan.highlighted;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card p-6 md:p-7 flex flex-col h-full transition-all duration-300",
        highlighted
          ? "border-2 border-secondary shadow-gold md:-translate-y-2"
          : "border-border hover:shadow-lg hover:-translate-y-1"
      )}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shadow-sm whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5" />
            {plan.badge}
          </div>
        </div>
      )}

      <div className="text-center mb-5 pt-2">
        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{plan.cadenceLabel}</p>
      </div>

      <div className="text-center mb-2">
        <span className="text-4xl md:text-5xl font-bold text-foreground">
          {plan.priceLabel}
        </span>
      </div>
      {plan.savingsLabel ? (
        <p className="text-center text-xs font-semibold text-secondary mb-5">
          {plan.savingsLabel}
        </p>
      ) : (
        <div className="h-5 mb-0" />
      )}

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check
              className={cn(
                "w-4 h-4 flex-shrink-0 mt-0.5",
                highlighted ? "text-secondary" : "text-primary"
              )}
            />
            <span className="text-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        size="lg"
        variant={highlighted ? "default" : plan.id === "free" ? "outline" : "default"}
        className={cn(
          "w-full",
          highlighted && "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        )}
      >
        <Link to={href}>{plan.ctaLabel}</Link>
      </Button>

      {plan.footnote && (
        <p className="text-center text-xs text-muted-foreground mt-3">{plan.footnote}</p>
      )}
    </div>
  );
}
