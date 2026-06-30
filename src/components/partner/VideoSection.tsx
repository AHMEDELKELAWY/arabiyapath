import { Link } from "react-router-dom";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  videoUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
}

export function VideoSection({ videoUrl, ctaLabel, ctaHref }: Props) {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background to-muted/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Watch a 2-minute walkthrough
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            See exactly how ArabiyaPath works before you enroll.
          </p>
        </div>

        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/20 via-card to-secondary/10 border border-border shadow-2xl aspect-video">
          {videoUrl ? (
            <iframe
              src={videoUrl}
              title="ArabiyaPath walkthrough"
              className="absolute inset-0 w-full h-full"
              allow="accelerated-2d-canvas; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/95 shadow-2xl flex items-center justify-center mb-4 hover:scale-110 transition-transform cursor-pointer">
                <Play className="w-8 h-8 text-primary fill-primary ml-1" />
              </div>
              <div className="text-sm font-medium text-foreground/70">Walkthrough video</div>
            </div>
          )}
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
