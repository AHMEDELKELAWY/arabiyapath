import { Shield, RefreshCcw, Headphones, Clock } from "lucide-react";

const signals = [
  {
    icon: Shield,
    title: "30-Day Money Back",
    description: "Full refund, no questions asked",
  },
  {
    icon: Clock,
    title: "Lifetime Access",
    description: "Learn at your own pace, forever",
  },
  {
    icon: RefreshCcw,
    title: "Free Updates",
    description: "New content added regularly",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "Get help when you need it",
  },
];

export function TrustSignals() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {signals.map((signal) => (
        <div
          key={signal.title}
          className="text-center p-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <signal.icon className="w-6 h-6 text-primary" />
          </div>
          <h4 className="font-semibold text-foreground text-sm mb-1">{signal.title}</h4>
          <p className="text-xs text-muted-foreground">{signal.description}</p>
        </div>
      ))}
    </div>
  );
}
