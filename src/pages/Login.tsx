import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { destinationForPlan, getPlanById } from "@/lib/membershipPlans";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { user, signIn, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromState = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  // Plan selection from the landing/pricing CTAs wins over generic `redirect`
  // so paid-plan users never bounce back to /pricing after login.
  const selectedPlan = getPlanById(searchParams.get("plan"));
  const planRedirect = selectedPlan ? destinationForPlan(selectedPlan.id) : null;
  const explicitRedirect = planRedirect ?? searchParams.get("redirect") ?? fromState ?? null;
  // Admin users default to /admin when no explicit destination was requested.
  const redirectUrl =
    explicitRedirect ?? (isAdmin ? "/admin" : "/dashboard");

  useEffect(() => {
    if (user && (explicitRedirect || isAdmin !== null)) {
      navigate(redirectUrl, { replace: true });
    }
  }, [user, isAdmin, explicitRedirect, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("email_not_confirmed")) {
        const emailRedirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`;
        await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } });
        toast({
          title: "Confirm your email",
          description: "We sent a fresh confirmation link to your inbox.",
        });
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        toast({
          title: "We couldn't sign you in",
          description:
            "Please check your email and password. If you originally signed up with Google, use the Google button above — or reset your password.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password.",
          variant: "destructive",
        });
      }
    } else {
      toast({ title: "Welcome back!", description: "You have logged in successfully." });
      // Navigation is handled by the useEffect once auth + isAdmin resolve,
      // so admins are routed to /admin instead of /dashboard.
    }
    setIsLoading(false);
  };

  return (
    <Layout>
      <section className="py-20 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6">
                <img 
                  src="/logo.png" 
                  alt="ArabiyaPath" 
                  className="h-12 w-auto"
                />
              </Link>
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Log in to continue your Arabic learning journey</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8">
              <OAuthButtons redirectUrl={redirectUrl} />
              <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-12 pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Log In <ArrowRight className="w-5 h-5" /></>}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Don't have an account? <Link to={`/signup${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`} className="text-primary font-medium hover:underline">Sign up free</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
