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
    // Responsive mobile cap by image count. Desktop is uniform 420px.
    const mobileMaxH =
      imageCount >= 3 ? "max-h-[140px]"
      : imageCount === 2 ? "max-h-[170px]"
      : "max-h-[220px]";

    return (
      <div
        className={cn(
          "relative mx-auto w-full max-w-[333px] md:max-w-[640px] overflow-hidden rounded-2xl bg-muted",
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
              "block w-full object-contain mx-auto md:max-h-[420px]",
              mobileMaxH
            )}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground text-sm">
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
