import certificateAsset from "@/assets/partner/certificate.jpg.asset.json";
import { ShieldCheck, Award } from "lucide-react";

export function CertificateSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary-foreground/80 text-xs font-bold uppercase tracking-wider mb-4">
              <Award className="w-3.5 h-3.5 text-secondary" /> Certificate
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
              Earn a Certificate of Completion
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              When you finish the course, you receive an official ArabiyaPath certificate — verifiable, shareable, and signed proof of your Arabic milestone.
            </p>
            <div className="mt-7 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Each certificate carries a unique verification code.
            </div>
          </div>

          <div className="order-1 lg:order-2 relative">
            <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-secondary/25 to-primary/15 blur-3xl rounded-[40%]" />
            <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-2xl mx-auto max-w-[420px] rotate-[-1.5deg] hover:rotate-0 transition-transform duration-500">
              <img
                src={certificateAsset.url}
                alt="ArabiyaPath Certificate of Completion"
                loading="lazy"
                className="block w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
