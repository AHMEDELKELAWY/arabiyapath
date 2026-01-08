import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";

const benefits = [
  "Access free trial lessons",
  "Track your progress",
  "Earn certificates",
  "Join the community",
];

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Layout>
      <section className="py-20 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Benefits */}
              <div className="hidden lg:block">
                <h2 className="text-3xl font-bold text-foreground mb-6">
                  Start Your Arabic Journey Today
                </h2>
                <p className="text-muted-foreground mb-8">
                  Join thousands of learners who are already mastering Arabic with 
                  our proven methodology.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 p-6 bg-accent rounded-2xl">
                  <p className="text-muted-foreground text-sm italic">
                    "ArabiyaPath made learning Gulf Arabic so much easier. The real-world 
                    scenarios helped me communicate with my colleagues in Dubai within weeks!"
                  </p>
                  <p className="mt-4 text-sm font-medium text-foreground">
                    — Michael R., Business Professional
                  </p>
                </div>
              </div>

              {/* Right - Form */}
              <div>
                <div className="text-center mb-8">
                  <Link to="/" className="inline-flex items-center gap-2 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-2xl">ع</span>
                    </div>
                  </Link>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Create Your Account
                  </h1>
                  <p className="text-muted-foreground">
                    Free access to trial lessons. No credit card required.
                  </p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-8">
                  <form className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          className="h-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          className="h-12 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters
                      </p>
                    </div>

                    <Button type="submit" size="lg" variant="hero" className="w-full">
                      Create Account
                      <ArrowRight className="w-5 h-5" />
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

                <p className="text-center text-xs text-muted-foreground mt-6">
                  By signing up, you agree to our{" "}
                  <Link to="/terms" className="underline hover:text-foreground">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
