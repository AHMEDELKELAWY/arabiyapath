import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { activateMembershipSubscription } from "@/lib/payments/paypalSubscriptions";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

export default function MembershipActivate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const subscriptionId = params.get("subscription_id");
  const [state, setState] = useState<"loading" | "active" | "pending" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const didRun = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login?redirect=" + encodeURIComponent(`/membership/activate?subscription_id=${subscriptionId ?? ""}`), { replace: true });
      return;
    }
    if (!subscriptionId) { setState("error"); setMessage("Missing subscription id."); return; }
    if (didRun.current) return;
    didRun.current = true;
    (async () => {
      try {
        const { status } = await activateMembershipSubscription(subscriptionId);
        if (status === "ACTIVE") {
          setState("active");
          setTimeout(() => navigate("/dashboard/progress#membership", { replace: true }), 1500);
        } else {
          setState("pending");
        }
      } catch (e) {
        setState("error");
        setMessage(e instanceof Error ? e.message : "Activation failed");
      }
    })();
  }, [isLoading, user, subscriptionId, navigate]);

  return (
    <>
      <SEOHead title="Activating your Membership" description="Finalizing your ArabiyaPath Membership subscription." canonicalPath="/membership/activate" noindex />
      <FocusLayout>
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>
                {state === "active" && "Membership activated"}
                {state === "loading" && "Confirming with PayPal…"}
                {state === "pending" && "Waiting for PayPal"}
                {state === "error" && "Something went wrong"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {state === "loading" && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> One moment while we activate your subscription.
                </p>
              )}
              {state === "active" && (
                <p className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5" /> Your Membership is now active — redirecting to your dashboard.
                </p>
              )}
              {state === "pending" && (
                <>
                  <p className="text-muted-foreground">
                    PayPal has received your approval but the subscription is still activating. This usually takes a minute.
                  </p>
                  <Button onClick={() => window.location.reload()} variant="outline" className="w-full">Check again</Button>
                  <Button asChild className="w-full"><Link to="/dashboard/progress">Go to Dashboard</Link></Button>
                </>
              )}
              {state === "error" && (
                <>
                  <p className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4 mt-0.5" /> {message || "We couldn't activate your subscription."}
                  </p>
                  <Button asChild variant="outline" className="w-full"><Link to="/membership/continue">Try again</Link></Button>
                  <Button asChild variant="ghost" className="w-full"><Link to="/contact">Contact support</Link></Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </FocusLayout>
    </>
  );
}
