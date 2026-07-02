import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { destinationForPlan, getPlanById } from "@/lib/membershipPlans";

const benefits = ["Access free trial lessons", "Track your progress", "Earn certificates", "Join the community"];

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Plan-aware destination: if a membership plan was selected on the landing
  // page it takes precedence over any `redirect` param so the user is never
  // asked to pick the same plan twice.
  const selectedPlan = getPlanById(searchParams.get("plan"));
  const redirectParam = searchParams.get("redirect");
  const redirectUrl = selectedPlan
    ? destinationForPlan(selectedPlan.id)
    : (redirectParam || "/dashboard");

  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Signup", path: "/signup" },
  ]);

  useEffect(() => {
    if (user) {
      navigate(redirectUrl, { replace: true });
    }
  }, [user, navigate, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, firstName, lastName, redirectUrl);
    if (error) {
      toast({ title: "Signup Failed", description: error.message || "Could not create account.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // Update marketing consent
    if (marketingConsent) {
      await supabase
        .from('profiles')
        .update({ marketing_consent: true })
        .eq('email', email);
    }

    toast({ title: "Account Created!", description: "Check your inbox to confirm your email." });
    setSubmitted(true);
    setIsLoading(false);
  };

  const handleResend = async () => {
    setIsResending(true);
    const emailRedirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });
    setIsResending(false);
    if (error) {
      toast({ title: "Could not resend", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "We sent a fresh confirmation link." });
    }
  };

  if (submitted) {
    return (
      <>
        <SEOHead title="Confirm Your Email" description="Confirm your ArabiyaPath email to start learning." canonicalPath="/signup" jsonLd={breadcrumbSchema} />
        <Layout>
          <section className="py-20 min-h-[calc(100vh-4rem)] flex items-center">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Confirm your email</h1>
                <p className="text-muted-foreground mb-2">We sent a confirmation link to</p>
                <p className="font-medium mb-6">{email}</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Click the link in the email to verify your account. You'll be signed in and taken straight to your course.
                </p>
                <Button onClick={handleResend} disabled={isResending} variant="outline" className="w-full">
                  {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend confirmation email"}
                </Button>
                <p className="text-xs text-muted-foreground mt-6">Check your spam folder if you don't see it.</p>
              </div>
            </div>
          </section>
        </Layout>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Sign Up"
        description="Create your ArabiyaPath account to access free trial lessons, track progress, and earn certificates."
        canonicalPath="/signup"
        jsonLd={breadcrumbSchema}
      />
      <Layout>
      <section className="py-20 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="hidden lg:block">
                <h2 className="text-3xl font-bold text-foreground mb-6">Start Your Arabic Journey Today</h2>
                <p className="text-muted-foreground mb-8">Join thousands of learners who are already mastering Arabic with our proven methodology.</p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-primary" /></div>
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-center mb-8">
                  <Link to="/" className="inline-flex items-center gap-2 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center"><span className="text-primary-foreground font-bold text-2xl">ع</span></div>
                  </Link>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Account</h1>
                  <p className="text-muted-foreground">Free access to trial lessons. No credit card required.</p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-8">
                  {selectedPlan && (
                    <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">
                        Continuing with the <span className="font-semibold">{selectedPlan.name}</span> plan
                        {selectedPlan.id !== "free" && (
                          <> · {selectedPlan.priceLabel} <span className="text-muted-foreground">{selectedPlan.cadenceLabel}</span></>
                        )}
                      </span>
                    </div>
                  )}
                  <OAuthButtons redirectUrl={redirectUrl} />
                  <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" placeholder="John" className="h-12" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" placeholder="Doe" className="h-12" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" className="h-12 pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                      </div>
                      <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="marketing" 
                        checked={marketingConsent}
                        onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                      />
                      <label htmlFor="marketing" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                        I'd like to receive updates, tips, and special offers from ArabiyaPath
                      </label>
                    </div>
                    <Button type="submit" size="lg" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-5 h-5" /></>}
                    </Button>
                  </form>
                  <div className="mt-6 text-center"><p className="text-muted-foreground text-sm">Already have an account? <Link to={`/login${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`} className="text-primary font-medium hover:underline">Log in</Link></p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </Layout>
    </>
  );
}
