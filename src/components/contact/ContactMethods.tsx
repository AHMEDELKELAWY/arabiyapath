import { Mail, MessageSquare, Clock } from "lucide-react";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Us",
    description: "admin@arabiyapath.com",
    detail: "We respond within 24 hours",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Available on the platform",
    detail: "Mon-Fri, 9AM-6PM GST",
  },
  {
    icon: Clock,
    title: "Response Time",
    description: "Usually within 24 hours",
    detail: "Faster for urgent issues",
  },
];

export function ContactMethods() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {contactMethods.map((method) => (
            <div
              key={method.title}
              className="bg-card rounded-2xl p-6 border border-border text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                <method.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{method.title}</h3>
              <p className="text-primary font-medium text-sm mb-1">{method.description}</p>
              <p className="text-muted-foreground text-xs">{method.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
