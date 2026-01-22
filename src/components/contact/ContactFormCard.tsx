import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackGenerateLead } from "@/lib/analytics";

type Props = {
  onSuccess: () => void;
};

export function ContactFormCard({ onSuccess }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Honeypot field (must stay empty)
  const [company, setCompany] = useState("");

  const pageUrl = useMemo(() => {
    // Using runtime URL so we always send canonical production URL when deployed.
    // This is used only in email body.
    return typeof window !== "undefined" ? window.location.href : "";
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          firstName,
          lastName,
          email,
          subject,
          message,
          company,
          pageUrl,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!(data as any)?.ok) {
        throw new Error("Email not sent");
      }

      // Track lead generation event ONLY after confirmed success
      trackGenerateLead("contact_form");

      toast({
        title: "Message sent!",
        description: "We’ll get back to you within 24 hours.",
      });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Couldn’t send message",
        description:
          "Please try again, or email us directly at admin@arabiyapath.com.",
        variant: "destructive",
      });
      // Keep form values on failure
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-8 md:p-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Send Us a Message</h2>
        <p className="text-muted-foreground">
          Fill out the form below and we&apos;ll get back to you soon.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Honeypot field */}
        <div className="hidden">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              required
              className="h-12"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              required
              className="h-12"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            required
            className="h-12"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="What's this about?"
            required
            className="h-12"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Tell us more about your question or issue..."
            required
            className="min-h-[150px] resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </div>
  );
}
