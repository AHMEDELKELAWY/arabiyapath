import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  getPlanById,
  MEMBERSHIP_FEATURES,
  PRODUCT_NAME,
  type MembershipPlan,
} from "@/lib/membershipPlans";
import { createMembershipSubscription } from "@/lib/payments/paypalSubscriptions";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Mail, Sparkles, Tag, X } from "lucide-react";



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

interface AppliedCoupon {
  code: string;
  percentOff: number;
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function ContinueToPayPalCTA({ plan }: { plan: MembershipPlan }) {
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "1";
  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const discountAmount = applied
    ? Math.round(plan.price * (applied.percentOff / 100) * 100) / 100
    : 0;
  const firstPaymentTotal = Math.max(0, plan.price - discountAmount);

  async function onApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Enter a coupon code.");
      return;
    }
    setValidating(true);
    setCouponError(null);
    try {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: Array<{ code: string; percent_off: number | null; discount_percent: number | null }> | null; error: unknown }>)(
        "lookup_coupon",
        { _code: code },
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        setApplied(null);
        setCouponError("This coupon code is invalid or expired.");
        return;
      }
      const percent = row.percent_off ?? row.discount_percent ?? 0;
      if (!percent || percent <= 0) {
        setApplied(null);
        setCouponError("This coupon has no discount value.");
        return;
      }
      setApplied({ code: row.code, percentOff: percent });
      setCouponError(null);
      toast({
        title: "Coupon applied",
        description: `${percent}% off your first payment.`,
      });
    } catch (e) {
      setApplied(null);
      setCouponError(
        e instanceof Error ? e.message : "Could not validate coupon. Try again.",
      );
    } finally {
      setValidating(false);
    }
  }

  function onRemoveCoupon() {
    setApplied(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function onContinue() {
    if (plan.id === "free") return;
    setLoading(true);
    try {
      const { approvalUrl } = await createMembershipSubscription(
        plan.id as "monthly" | "six_months" | "yearly",
        applied ? { couponCode: applied.code } : {},
      );
      window.location.href = approvalUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start PayPal checkout";
      toast({ title: "PayPal error", description: msg, variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {cancelled && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm px-3 py-2">
          Checkout was cancelled. You can try again anytime — no charge was made.
        </div>
      )}

      {/* Coupon section */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <Label htmlFor="coupon" className="flex items-center gap-2 text-sm font-medium">
          <Tag className="w-4 h-4 text-primary" />
          Have a coupon?
        </Label>
        {applied ? (
          <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">{applied.code}</span>
              <span className="text-muted-foreground">
                — {applied.percentOff}% off first payment
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemoveCoupon}
              aria-label="Remove coupon"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="coupon"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                if (couponError) setCouponError(null);
              }}
              placeholder="Enter coupon code"
              maxLength={40}
              className="uppercase"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onApplyCoupon();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={onApplyCoupon}
              disabled={validating || !couponInput.trim()}
            >
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        )}
        {couponError && (
          <p className="text-sm text-destructive">{couponError}</p>
        )}
      </div>

      {/* Price breakdown */}
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Plan price</span>
          <span>{formatPrice(plan.price, plan.currency)}</span>
        </div>
        {applied && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Discount ({applied.percentOff}% — first payment only)</span>
            <span>−{formatPrice(discountAmount, plan.currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base border-t pt-2">
          <span>First payment today</span>
          <span>{formatPrice(firstPaymentTotal, plan.currency)}</span>
        </div>
        {applied && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Renewal {plan.cadenceLabel}</span>
            <span>{formatPrice(plan.price, plan.currency)}</span>
          </div>
        )}
      </div>

      <Button size="lg" className="w-full" onClick={onContinue} disabled={loading}>
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to PayPal…</>
        ) : (
          <>Continue to PayPal · {formatPrice(firstPaymentTotal, plan.currency)}</>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        You'll be redirected to PayPal to approve the {plan.name} subscription for {PRODUCT_NAME}.
        {applied && " The discount applies to your first payment only; renewals bill at the full plan price."}
      </p>
    </div>
  );
}


