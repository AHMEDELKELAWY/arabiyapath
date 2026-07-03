import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlanById,
  MEMBERSHIP_FEATURES,
  PRODUCT_NAME,
  type MembershipPlan,
} from "@/lib/membershipPlans";
import { createMembershipSubscription } from "@/lib/payments/paypalSubscriptions";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react";


/**
 * Post-signup landing for paid Membership plans.
 *
 * Phase 1: preserves plan intent end-to-end, but stops cleanly before charging.
 * Phase 2 will replace the body of this page with real subscription checkout
 * — the URL, funnel, and query param stay identical so no rewiring is needed.
 */
export default function MembershipContinue() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const planId = searchParams.get("plan");
  const plan = getPlanById(planId);

  // Never let a paid plan be viewed without an account — bounce through Signup
  // while preserving the selected plan.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const target = plan ? `/signup?plan=${plan.id}` : "/pricing";
      navigate(target, { replace: true });
    }
  }, [isLoading, user, plan, navigate]);

  if (!plan || plan.id === "free") {
    return (
      <FocusLayout>
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Choose your Membership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                We couldn't find that plan. Head back to Pricing to pick one.
              </p>
              <Button asChild className="w-full">
                <Link to="/pricing">View plans</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </FocusLayout>
    );
  }

  if (!user) return null; // redirect in-flight

  return (
    <>
      <SEOHead
        title={`Your ${plan.name} Membership`}
        description={`You selected the ${plan.name} plan for ${PRODUCT_NAME}. Subscription checkout opens soon.`}
        canonicalPath="/membership/continue"
        noindex
      />
      <FocusLayout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 sm:py-12">
          <div className="container max-w-3xl px-4 sm:px-6">
            <PlanContinueCard plan={plan} />
          </div>
        </div>
      </FocusLayout>
    </>
  );
}

function PlanContinueCard({ plan }: { plan: MembershipPlan }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="secondary" className="mb-3 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Plan selected
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold">
          Your {plan.name} Membership
        </h1>
        <p className="text-muted-foreground mt-2">
          You're one step away from full access to {PRODUCT_NAME}.
        </p>
      </div>

      <Card className="border-2 border-primary/20 overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <CardTitle className="text-xl">{plan.name} plan</CardTitle>
            <div className="text-right">
              <div className="text-3xl font-bold">{plan.priceLabel}</div>
              <div className="text-xs text-muted-foreground">{plan.cadenceLabel}</div>
            </div>
          </div>
          {plan.savingsLabel && (
            <p className="text-sm font-semibold text-secondary mt-1">
              {plan.savingsLabel}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {MEMBERSHIP_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <ContinueToPayPalCTA plan={plan} />

          <div className="grid sm:grid-cols-2 gap-3">
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link to="/pricing">Change plan</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="w-full">
              <Link to="/dashboard/progress">Go to Dashboard</Link>
            </Button>
          </div>

          <p className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Mail className="w-3.5 h-3.5" />
            Secure recurring billing by PayPal. Cancel anytime from your Membership dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ContinueToPayPalCTA({ plan }: { plan: MembershipPlan }) {
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "1";
  const [loading, setLoading] = useState(false);

  async function onContinue() {
    if (plan.id === "free") return;
    setLoading(true);
    try {
      const { approvalUrl } = await createMembershipSubscription(
        plan.id as "monthly" | "six_months" | "yearly",
      );
      window.location.href = approvalUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start PayPal checkout";
      toast({ title: "PayPal error", description: msg, variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {cancelled && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm px-3 py-2">
          Checkout was cancelled. You can try again anytime — no charge was made.
        </div>
      )}
      <Button size="lg" className="w-full" onClick={onContinue} disabled={loading}>
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to PayPal…</>
        ) : (
          <>Continue to PayPal · {plan.priceLabel} {plan.cadenceLabel}</>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        You'll be redirected to PayPal to approve the {plan.name} subscription for {PRODUCT_NAME}.
      </p>
    </div>
  );
}

