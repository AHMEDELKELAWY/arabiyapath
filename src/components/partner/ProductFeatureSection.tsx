import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  image: { url: string };
  alt: string;
  side?: "left" | "right";
  /** Optional extra decoration overlayed on the screenshot frame. */
  decoration?: ReactNode;
}

/**
 * Premium "feature with real screenshot" section.
 * Mobile: screenshot stacks above copy.
 * Desktop: alternates left/right.
 */
export function ProductFeatureSection({
  eyebrow,
  title,
  description,
  bullets,
  image,
  alt,
  side = "left",
  decoration,
}: Props) {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div
          className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
            side === "right" ? "lg:[&>div:first-child]:order-2" : ""
          }`}
        >
          {/* Screenshot */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-primary/20 via-secondary/15 to-transparent blur-3xl rounded-[40%]" />
            <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-2xl mx-auto max-w-[420px]">
              <img
                src={image.url}
                alt={alt}
                loading="lazy"
                className="block w-full h-auto"
              />
            </div>
            {decoration}
          </div>

          {/* Copy */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              {eyebrow}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
              {title}
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{description}</p>
            <ul className="mt-7 space-y-3 max-w-md">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </span>
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
