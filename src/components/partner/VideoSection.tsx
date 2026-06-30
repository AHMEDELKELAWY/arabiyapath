import { Link } from "react-router-dom";
import { Play, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  videoUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
}

export function VideoSection({ videoUrl, ctaLabel, ctaHref }: Props) {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> See it in action
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Watch a 2-minute walkthrough
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            See exactly how ArabiyaPath works before you enroll.
          </p>
        </div>

        <div className="relative group">
          {/* Ambient glow */}
          <div className="absolute -inset-8 -z-10 bg-gradient-to-br from-primary/30 via-secondary/20 to-primary/10 blur-3xl opacity-70" />

          <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-br from-card/80 via-card to-card/60 backdrop-blur-xl shadow-2xl aspect-video">
            {videoUrl ? (
              <iframe
                src={videoUrl}
                title="ArabiyaPath walkthrough"
                loading="lazy"
                className="absolute inset-0 w-full h-full"
                allow="accelerated-2d-canvas; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <>
                {/* Decorative gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/15" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-2xl" />

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <button
                    type="button"
                    className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer group"
                    aria-label="Walkthrough video coming soon"
                  >
                    <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-60" />
                    <Play className="relative w-8 h-8 sm:w-10 sm:h-10 text-primary fill-primary ml-1" />
                  </button>
                  <div className="mt-5 text-sm text-foreground/70 font-medium">
                    2-minute product tour · Coming soon
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-10">
          <Button size="lg" className="h-13 px-7 shadow-teal" asChild>
            <Link to={ctaHref}>
              {ctaLabel}
              <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
