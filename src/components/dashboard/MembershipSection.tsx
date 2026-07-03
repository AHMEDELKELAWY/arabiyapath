import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMembership } from "@/hooks/useMembership";
import { CreditCard, ExternalLink, Loader2, Sparkles } from "lucide-react";

const PLAN_LABEL: Record<string, string> = {
  monthly: "Monthly",
  six_months: "6 Months",
  yearly: "Yearly",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  APPROVAL_PENDING: "secondary",
  CANCELLED: "outline",
  SUSPENDED: "destructive",
  EXPIRED: "destructive",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

export function MembershipSection() {
  const { loading, subscription } = useMembership();

  return (
    <section id="membership" className="scroll-mt-20">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>Membership</CardTitle>
          </div>
          {subscription && (
            <Badge variant={STATUS_VARIANT[subscription.status] ?? "outline"}>
              {subscription.status.replace("_", " ")}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </p>
          ) : !subscription ? (
            <>
              <p className="text-sm text-muted-foreground">
                You don't have an active Membership yet. Unlock all units, audio, and quizzes.
              </p>
              <Button asChild><Link to="/pricing#membership">View Membership plans</Link></Button>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Current plan</div>
                  <div className="font-semibold">{PLAN_LABEL[subscription.plan] ?? subscription.plan}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Next billing date</div>
                  <div className="font-semibold">{formatDate(subscription.next_billing_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Started</div>
                  <div className="font-semibold">{formatDate(subscription.started_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Subscription ID</div>
                  <div className="font-mono text-xs break-all">{subscription.paypal_subscription_id}</div>
                </div>
              </div>

              {subscription.status === "CANCELLED" && subscription.expires_at && (
                <p className="text-xs text-muted-foreground">
                  Access remains until {formatDate(subscription.expires_at)}.
                </p>
              )}

              <div className="grid sm:grid-cols-3 gap-2 pt-2">
                <Button asChild variant="outline">
                  <a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer">
                    <CreditCard className="w-4 h-4 mr-2" /> Manage in PayPal <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
                <Button asChild variant="outline"><Link to="/pricing#membership">Upgrade plan</Link></Button>
                <Button asChild variant="ghost">
                  <a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer">
                    Cancel membership
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Membership is managed by PayPal. Cancel or change your payment method directly in your PayPal account.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
