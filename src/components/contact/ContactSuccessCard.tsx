import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onReset: () => void;
};

export function ContactSuccessCard({ onReset }: Props) {
  return (
    <div className="bg-card rounded-3xl border border-border p-8 md:p-10">
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Message Received!</h2>
        <p className="text-muted-foreground mb-6">
          Thank you for reaching out. Our team will respond within 24 hours.
        </p>
        <Button variant="outline" onClick={onReset}>
          Send Another Message
        </Button>
      </div>
    </div>
  );
}
