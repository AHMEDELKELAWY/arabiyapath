import { Watermark } from "./Watermark";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * Flash card image with CSS watermark overlay.
 * Realistic photo only — image must NOT contain text or baked-in watermark.
 */
export function FlashCardImage({ src, alt, className }: Props) {
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
