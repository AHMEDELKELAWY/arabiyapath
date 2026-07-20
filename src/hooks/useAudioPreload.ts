import { useEffect } from "react";

// Module-scoped cache so the same URL is only fetched once per session.
const preloaded = new Set<string>();

/**
 * Preloads a list of audio URLs by warming the HTTP cache with a low-priority
 * fetch. Subsequent <audio src> playback resolves from cache with no network
 * wait, making Next/Previous transitions instant on slow networks.
 *
 * Nulls/undefined/empty strings are ignored. Duplicates are de-duplicated
 * across the whole session.
 */
export function useAudioPreload(urls: Array<string | null | undefined>) {
  useEffect(() => {
    const unique = Array.from(
      new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0))
    ).filter((u) => !preloaded.has(u));
    if (unique.length === 0) return;

    const controllers: AbortController[] = [];
    for (const src of unique) {
      preloaded.add(src);
      const controller = new AbortController();
      controllers.push(controller);
      // `fetch` with default (cors) semantics warms the browser HTTP cache
      // for the exact URL the <audio> element will later request.
      fetch(src, {
        method: "GET",
        cache: "force-cache",
        credentials: "omit",
        signal: controller.signal,
        ...({ priority: "low" } as Record<string, unknown>),
      } as RequestInit)
        .then((res) => {
          // Drain body so the cache entry is committed.
          if (res.ok) return res.blob().then(() => undefined);
        })
        .catch(() => {
          // If aborted or network fails, allow a future retry.
          preloaded.delete(src);
        });
    }
    return () => {
      for (const c of controllers) c.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);
}
