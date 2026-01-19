import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitAffiliateApplication } from "@/hooks/useAffiliateApplications";
import { toast } from "sonner";
import { Users, Loader2 } from "lucide-react";

interface BecomeAffiliateModalProps {
  children?: React.ReactNode;
}

export function BecomeAffiliateModal({ children }: BecomeAffiliateModalProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
  );
  const [phone, setPhone] = useState("");
  const [howWillPromote, setHowWillPromote] = useState("");

  const submitMutation = useSubmitAffiliateApplication();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !howWillPromote.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        how_will_promote: howWillPromote.trim(),
      });
      toast.success("Application submitted successfully!");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Users className="h-4 w-4" />
            Become a Partner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Become an Affiliate Partner</DialogTitle>
          <DialogDescription>
            Join our affiliate program and earn commissions by promoting our courses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="howWillPromote">How will you promote our courses? *</Label>
            <Textarea
              id="howWillPromote"
              value={howWillPromote}
              onChange={(e) => setHowWillPromote(e.target.value)}
              placeholder="Describe your marketing strategy, audience, and platforms you'll use..."
              rows={4}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="flex-1"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
