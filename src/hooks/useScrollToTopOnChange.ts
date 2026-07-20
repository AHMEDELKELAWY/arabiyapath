import { useEffect, useRef } from "react";

/**
 * Smoothly scroll a target element to the top of the visible viewport whenever
 * `dep` changes. Used for card/question navigation so the learner always starts
 * at the beginning of the new content instead of a leftover scroll position.
 *
 * Accounts for sticky header + sticky tabs via CSS `scroll-margin-top`
 * (apply e.g. `scroll-mt-[112px] md:scroll-mt-24` on the target element).
 *
 * Respects `prefers-reduced-motion`.
 */
export function useScrollToTopOnChange<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    // Skip the initial mount — we only want to reposition on subsequent changes
    // so we don't fight route-level ScrollToTop or hydration.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Wait one frame so the new content has laid out before we scroll.
    const raf = requestAnimationFrame(() => {
      try {
        el.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start",
        });
      } catch {
        el.scrollIntoView(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [dep]);

  return ref;
}
