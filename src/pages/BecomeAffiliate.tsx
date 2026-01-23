import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowRight, CheckCircle2, Loader2, Users, DollarSign, Share2 } from "lucide-react";
import { BecomeAffiliateModal } from "@/components/dashboard/BecomeAffiliateModal";
import { useMyAffiliateApplication } from "@/hooks/useAffiliateApplications";

const benefits = [
  { icon: DollarSign, text: "Earn commission on every referral" },
  { icon: Users, text: "Get your unique discount code" },
  { icon: Share2, text: "Access marketing materials" },
  { icon: CheckCircle2, text: "Track earnings in real-time" },
];

export default function BecomeAffiliate() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [howWillPromote, setHowWillPromote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: existingApplication } = useMyAffiliateApplication();

  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Become Affiliate", path: "/become-affiliate" },
  ]);

  // If user is logged in and already has an application or is affiliate, redirect
  useEffect(() => {
    if (!authLoading && user) {
      if (existingApplication?.status === "approved") {
        navigate("/affiliate");
      }
    }
  }, [user, authLoading, existingApplication, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    
    if (!howWillPromote.trim()) {
      toast({ title: "Error", description: "Please tell us how you plan to promote ArabiyaPath.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signUpError) {
        toast({ title: "Signup Failed", description: signUpError.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        toast({ title: "Error", description: "Failed to create account.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // 2. Create affiliate application
      const { error: appError } = await supabase
        .from("affiliate_applications")
        .insert({
          user_id: userId,
          full_name: `${firstName} ${lastName}`.trim(),
          phone: phone || null,
          how_will_promote: howWillPromote,
          status: "pending",
        });

      if (appError) {
        console.error("Affiliate application error:", appError);
        // Don't fail the signup, just log it
      }

      // 3. Send verification email
      try {
        await supabase.functions.invoke("send-verification-email", {
          body: { email, firstName },
        });
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }

      toast({ 
        title: "Account Created!", 
        description: "Your partner application has been submitted. Please verify your email." 
      });
      navigate("/verify-email");

    } catch (err) {
      console.error("Signup error:", err);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // If user is logged in, show the modal version
  if (!authLoading && user) {
    return (
      <>
        <SEOHead
          title="Become an Affiliate"
          description="Join the ArabiyaPath affiliate program and earn commission on every referral. Apply in minutes and track earnings in real-time."
          canonicalPath="/become-affiliate"
          jsonLd={breadcrumbSchema}
        />
        <Layout>
        <section className="py-20 min-h-[calc(100vh-4rem)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-hero-gradient flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">Become a Partner</h1>
              
              {existingApplication?.status === "pending" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <p className="text-amber-800">Your application is pending review. We'll notify you once it's approved!</p>
                </div>
              ) : existingApplication?.status === "rejected" ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <p className="text-red-800 mb-4">Your previous application was not approved.</p>
                  <BecomeAffiliateModal>
                    <Button variant="hero">Apply Again</Button>
                  </BecomeAffiliateModal>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-8">
                    Join our affiliate program and earn commission on every successful referral.
                  </p>
                  <BecomeAffiliateModal>
                    <Button variant="hero" size="lg">
                      Apply Now <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </BecomeAffiliateModal>
                </>
              )}
            </div>
          </div>
        </section>
        </Layout>
      </>
    );
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <>
        <SEOHead
          title="Become an Affiliate"
          description="Join the ArabiyaPath affiliate program and earn commission on every referral. Apply in minutes and track earnings in real-time."
          canonicalPath="/become-affiliate"
          jsonLd={breadcrumbSchema}
        />
        <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        </Layout>
      </>
    );
  }

  // Full signup + affiliate form for non-logged-in users
  return (
    <>
      <SEOHead
        title="Become an Affiliate"
        description="Join the ArabiyaPath affiliate program and earn commission on every referral. Apply in minutes and track earnings in real-time."
        canonicalPath="/become-affiliate"
        jsonLd={breadcrumbSchema}
      />
      <Layout>
      <section className="py-20 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Benefits sidebar */}
              <div className="hidden lg:block lg:sticky lg:top-24">
                <div className="w-16 h-16 rounded-2xl bg-hero-gradient flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Join Our Partner Program
                </h2>
                <p className="text-muted-foreground mb-8">
                  Earn money by sharing ArabiyaPath with your audience. Get your unique discount code and start earning today.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit.text} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <benefit.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-foreground">{benefit.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Form */}
              <div>
                <div className="text-center mb-8 lg:hidden">
                  <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">Join Our Partner Program</h1>
                </div>

                <div className="bg-card rounded-2xl border border-border p-8">
                  <h3 className="text-lg font-semibold text-foreground mb-6">Create Your Partner Account</h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Account Info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input 
                          id="firstName" 
                          placeholder="John" 
                          className="h-12" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input 
                          id="lastName" 
                          placeholder="Doe" 
                          className="h-12" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="you@example.com" 
                        className="h-12" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Create a strong password" 
                          className="h-12 pr-12" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                    </div>

                    {/* Partner Info */}
                    <div className="border-t border-border pt-5 mt-5">
                      <h4 className="text-sm font-medium text-muted-foreground mb-4">Partner Application</h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number (Optional)</Label>
                          <Input 
                            id="phone" 
                            type="tel" 
                            placeholder="+1 234 567 890" 
                            className="h-12" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="howWillPromote">How will you promote ArabiyaPath? *</Label>
                          <Textarea 
                            id="howWillPromote" 
                            placeholder="Tell us about your audience, social media, blog, or other channels..." 
                            className="min-h-[100px] resize-none" 
                            value={howWillPromote} 
                            onChange={(e) => setHowWillPromote(e.target.value)} 
                            required 
                          />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" size="lg" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Create Account & Apply <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-muted-foreground text-sm">
                      Already have an account?{" "}
                      <Link to="/login" className="text-primary font-medium hover:underline">
                        Log in
                      </Link>
                    </p>
                  </div>
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
