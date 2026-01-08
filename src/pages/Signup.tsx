import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const benefits = ["Access free trial lessons", "Track your progress", "Earn certificates", "Join the community"];

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, firstName, lastName);
    if (error) {
      toast({ title: "Signup Failed", description: error.message || "Could not create account.", variant: "destructive" });
    } else {
      toast({ title: "Account Created!", description: "Welcome to ArabiyaPath!" });
      navigate("/dashboard");
    }
    setIsLoading(false);
  };

  return (
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
                  <form onSubmit={handleSubmit} className="space-y-5">
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
                    <Button type="submit" size="lg" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-5 h-5" /></>}
                    </Button>
                  </form>
                  <div className="mt-6 text-center"><p className="text-muted-foreground text-sm">Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link></p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
