import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  mode: "none" | "free";
}

export function MembershipUpsellHero({ mode }: Props) {
  if (mode === "free") {
    return (
      <Card className="bg-hero-gradient text-primary-foreground overflow-hidden">
        <CardContent className="p-6 lg:p-8 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
            <Sparkles className="w-4 h-4" /> Complimentary Access
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              You're enjoying complimentary access 🎉
            </h2>
            <p className="text-primary-foreground/80 max-w-2xl">
              Your free membership gives you access to selected content. Upgrade anytime to
              unlock the complete learning experience.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/pricing#membership">
                Upgrade Membership
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/pricing#membership">Compare Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // "none" — no membership yet
  const benefits = [
    "Complete Spoken Arabic Course",
    "4000+ Flashcards",
    "Smart Review System",
    "Certificates & Progress Tracking",
  ];

  return (
    <Card className="bg-hero-gradient text-primary-foreground overflow-hidden">
      <CardContent className="p-6 lg:p-8 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
          <Sparkles className="w-4 h-4" /> Membership
        </div>
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">
            Unlock the Full Arabic Experience
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl">
            Learn Spoken Arabic with structured lessons, flashcards, quizzes, certificates and
            lifetime progress tracking.
          </p>
        </div>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-primary-foreground/90">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button asChild size="lg" variant="secondary" className="gap-2">
            <Link to="/pricing#membership">
              Start Membership
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/pricing#membership">Compare Plans</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
