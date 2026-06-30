import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import videoAsset from "@/assets/partner/partner-video.png.asset.json";

interface Props {
  videoUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
}

const BULLETS = [
  "Real product walkthrough",
  "See all learning modes",
  "Understand how it works",
  "Perfect for beginners",
];

export function VideoSection({ videoUrl, ctaLabel, ctaHref }: Props) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="container mx-auto max-w-7xl" data-reveal>
        <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent))_0%,transparent_24%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(150_52%_98%)_100%)] p-5 shadow-[0_28px_80px_hsl(var(--foreground)/0.08)] lg:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary">
                <Play className="h-4 w-4 fill-current" />
                Watch before you buy
              </div>
              <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl">
                See ArabiyaPath <span className="text-primary">in action</span>
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                Take a quick 2-minute walkthrough and discover how you’ll learn Arabic using interactive flashcards, native audio, speaking practice, quizzes, and spaced repetition.
              </p>
              <ul className="mt-6 space-y-3">
                {BULLETS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-base text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="xl" className="partner-cta group rounded-full px-8">
                  <Link to={ctaHref}>
                    {videoUrl ? "Watch 2-Minute Tour" : ctaLabel}
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <div className="text-sm text-muted-foreground">Loved by 2,000+ students · 4.9/5</div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.18),transparent_62%)] blur-2xl" />
              {videoUrl ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-border/60 bg-card p-3 shadow-2xl">
                  <div className="flex items-center gap-2 border-b border-border/60 px-2 pb-3">
                    <span className="h-3 w-3 rounded-full bg-destructive/70" />
                    <span className="h-3 w-3 rounded-full bg-secondary/80" />
                    <span className="h-3 w-3 rounded-full bg-primary/80" />
                  </div>
                  <div className="relative mt-3 h-[calc(100%-1rem)] overflow-hidden rounded-[1.5rem] bg-card">
                    <iframe
                      src={videoUrl}
                      title="ArabiyaPath video walkthrough"
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-2xl">
                  <img
                    src={videoAsset.url}
                    alt="ArabiyaPath video demo preview"
                    className="w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_45%)]" />
                  <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-border/50 bg-background/80 px-5 py-4 text-center text-sm font-medium text-muted-foreground backdrop-blur-md">
                    Video coming soon — this section is already ready for your YouTube walkthrough.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
