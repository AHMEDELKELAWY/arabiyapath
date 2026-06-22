import { Watermark } from "./Watermark";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** When true, caps the visible image height (250px mobile / 500px desktop). */
  capped?: boolean;
}

/**
 * Flash card image with CSS watermark overlay.
 * Realistic photo only — image must NOT contain text or baked-in watermark.
 */
export function FlashCardImage({ src, alt, className, capped }: Props) {
  if (capped) {
    return (
      <div
        className={cn(
          "relative mx-auto w-full max-w-[333px] md:max-w-[667px] overflow-hidden rounded-2xl bg-muted",
          className
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="block w-full max-h-[250px] md:max-h-[500px] object-contain mx-auto"
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
