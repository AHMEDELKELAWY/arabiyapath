import { useEffect } from "react";

/**
 * Preloads a list of image URLs by instantiating Image objects.
 * The browser caches them so subsequent <img src> renders are instant.
 * Nulls/undefined/empty strings are ignored. Duplicates are de-duplicated.
 */
export function useImagePreload(urls: Array<string | null | undefined>) {
  useEffect(() => {
    const unique = Array.from(
      new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0))
    );
    if (unique.length === 0) return;

    const imgs: HTMLImageElement[] = [];
    for (const src of unique) {
      const img = new Image();
      img.decoding = "async";
      // Hint low priority so we don't fight the current LCP image.
      (img as unknown as { fetchPriority?: string }).fetchPriority = "low";
      img.src = src;
      imgs.push(img);
    }
    return () => {
      // Cancel in-flight loads for adjacent images we never navigated to.
      for (const img of imgs) img.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);
}
