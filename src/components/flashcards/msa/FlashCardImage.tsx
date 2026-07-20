import { Watermark } from "./Watermark";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** When true, caps the visible image height responsively. */
  capped?: boolean;
  /**
   * Number of images shown together in this card.
   * Controls the mobile max-height so multi-image cards don't dominate the viewport.
   * Desktop max-height stays at 420px regardless.
   */
  imageCount?: 1 | 2 | 3 | number;
}

/**
 * Flash card image with CSS watermark overlay.
 * Realistic photo only — image must NOT contain text or baked-in watermark.
 */
export function FlashCardImage({ src, alt, className, capped, imageCount = 1 }: Props) {
  if (capped) {
    // Keep the whole study card (image + word + meaning + audio + next button)
    // inside a typical viewport. Image shrinks first via a viewport-relative cap.
    // Multi-image cards get a tighter cap so the grid still fits.
    const heightCap =
      imageCount >= 3
        ? "max-h-[clamp(100px,18vh,180px)] md:max-h-[26vh]"
        : imageCount === 2
          ? "max-h-[clamp(130px,22vh,220px)] md:max-h-[30vh]"
          : "max-h-[clamp(150px,28vh,300px)] md:max-h-[38vh]";

    return (
      <div
        className={cn(
          "relative mx-auto w-full max-w-[420px] md:max-w-[560px] overflow-hidden rounded-2xl bg-muted flex items-center justify-center",
          className
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "block w-auto max-w-full mx-auto object-contain",
              heightCap
            )}
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        <Watermark />
      </div>
    );
  }


  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-muted aspect-[4/3]", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          No image
        </div>
      )}
      <Watermark />
    </div>
  );
}
