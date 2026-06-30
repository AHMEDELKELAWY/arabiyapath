import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const videoImageUrl = "/partner/video.png";

interface Props {
  videoUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
}

const BULLETS = [
  "A 2-minute product walkthrough",
  "See all 4 learning modes in motion",
  "No fluff — just how it works",
];

export function VideoSection({ videoUrl, ctaLabel, ctaHref }: Props) {
  return (
    <section className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,hsl(152_46%_98%)_0%,hsl(var(--background))_100%)]" />
      <div className="container mx-auto max-w-6xl" data-reveal>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Play className="h-3.5 w-3.5 fill-current" />
              Watch first
            </div>
            <h2 className="mt-5 text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-[2.4rem]">
              Two minutes is all it takes to <span className="text-primary">get it.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Skip the pitch — watch the actual product. You'll understand exactly what you're getting before you spend a cent.
            </p>
            <ul className="mt-6 space-y-2.5">
              {BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground sm:text-base">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Button asChild size="lg" className="partner-cta group rounded-full px-7">
                <Link to={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.18),transparent_62%)] blur-3xl" />
            {videoUrl ? (
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
                <iframe
                  src={videoUrl}
                  title="ArabiyaPath video walkthrough"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_30px_80px_hsl(var(--foreground)/0.12)]">
                <img src={videoImageUrl} alt="Product walkthrough" className="w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,hsl(var(--foreground)/0.55)_100%)]" />
                <button
                  type="button"
                  className="absolute left-1/2 top-1/2 inline-flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 shadow-[0_18px_46px_hsl(var(--foreground)/0.25)] transition-transform duration-300 group-hover:scale-110"
                  aria-label="Play walkthrough"
                >
                  <Play className="ml-1 h-7 w-7 fill-primary text-primary" />
                </button>
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border/40 bg-background/85 px-4 py-2.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
                  Walkthrough coming soon — the section is ready for your YouTube embed.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
