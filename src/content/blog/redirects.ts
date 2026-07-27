/**
 * Consolidated blog posts.
 *
 * These slugs targeted near-identical head terms ("learn arabic online",
 * "learn arabic language online", "study arabic online", ...) and split ranking
 * signals across several thin duplicates. They now point at a single pillar.
 *
 * Note: this is a client-side redirect (SPA). It removes the duplicate from the
 * sitemap and internal links and sends users/crawlers that execute JS to the
 * pillar. For a true 301, add a server/host-level redirect rule for these paths.
 */
export const BLOG_SLUG_REDIRECTS: Record<string, string> = {
  "learn-arabic-language-online": "learn-arabic-online",
  "learnarabiconline": "learn-arabic-online",
  "arabic-language-online": "learn-arabic-online",
  "study-arabic-online": "learn-arabic-online",
};

/** Slugs retired by the consolidation above — excluded from listings + sitemap. */
export const RETIRED_BLOG_SLUGS = new Set(Object.keys(BLOG_SLUG_REDIRECTS));
