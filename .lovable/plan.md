## Where the site stands today (Semrush, US database)

- 15 organic keywords, ~0 estimated monthly organic traffic. The site is indexed but nothing ranks on page 1 yet.
- Every ranking keyword belongs to just two pages: `/learn/gulf-arabic` and `/learn/fusha-arabic`. The 23 blog posts rank for nothing measurable.
- Best positions: `fusha arabic` (720/mo) at #18, `fus ha` (260/mo) at #20, `khaliji arabic` (260/mo) at #28, `arabic khaleeji` (90/mo) at #20, `what is fusha arabic` (40/mo) at #16.
- Competitors are small and beatable: masterfusha.com, yallakhaleeji.com, gulfarabicresources.com, al-fusha.com. Nobody dominates "Gulf/Khaleeji Arabic" learning.

Read: the technical foundation is fine (helmet-based per-route meta, sitemap, robots, JSON-LD). The gap is **topical depth on the two themes that already work** and **zero authority signals**. Positions 16–28 are the fastest money — a page at #18 needs a push, not a rewrite.

## Strategy

Stop spreading across generic "learn arabic online" head terms (that's what the 23 blog posts chase, and they rank for nothing). Own two clusters instead:

1. **Khaleeji / Gulf Arabic** — the least contested niche in the data, and the paid product.
2. **Fusha / MSA** — already the strongest signal, feeds the Spoken Arabic + vocabulary products.

## Phase 1 — Harvest what's already ranking (weeks 1–2)

Rewrite and expand the two landing pages that hold all current rankings.

- `/learn/fusha-arabic`: target `fusha arabic`, `fus ha`, `fusha in arabic`, `what is fusha arabic`. Add an explicit "What is Fusha Arabic?" H2 with a direct 40-word answer, a Fusha-vs-dialect comparison table, and an alphabet section (`fusha arabic alphabet` is ranking at #31).
- `/learn/gulf-arabic`: target `khaliji arabic`, `arabic khaleeji`, `khaleeji arabic`, `gulf arabic dialect`, `khaleeji meaning in arabic`. Add a "Khaleeji meaning" answer block and a country-by-country dialect breakdown (UAE, Saudi, Qatar, Kuwait, Bahrain, Oman).
- Add `FAQPage` + `Course` JSON-LD to both (helpers already exist in `SEOHead.tsx`).
- Internal links from every blog post and the homepage into these two hubs with descriptive anchor text.

## Phase 2 — Build the two clusters (weeks 3–8)

New supporting pages, each linking up to its hub:

**Gulf cluster:** Khaleeji vs Egyptian Arabic · Gulf Arabic alphabet & pronunciation · Emirati vs Saudi vs Kuwaiti dialect · 100 Gulf Arabic phrases · Gulf Arabic numbers · Is Gulf Arabic hard to learn?

**Fusha cluster:** Fusha Arabic alphabet (full guide) · Fusha vs Ammiyya · MSA grammar basics for beginners · Fusha Arabic pronunciation · Learn to read Arabic in 30 days

Each page: one H1, direct-answer paragraph in the first 60 words, 1,200–1,800 words, FAQ block with `FAQPage` schema, and a CTA into the free lesson funnel.

## Phase 3 — Fix the existing blog (weeks 3–4, parallel)

The 23 posts targeting `learn arabic online`, `online arabic classes`, `arabic lessons online`, etc. compete with Duolingo, Preply and italki and will not rank.

- Keep and rewrite the 4 that fit the clusters (`learn-gulf-arabic-online`, `gulf-vs-fusha-arabic`, `fusha-vs-gulf-arabic`, `why-learn-gulf-arabic`).
- Consolidate the near-duplicate head-term posts (`learn-arabic-online`, `learn-arabic-language-online`, `learnarabiconline`, `arabic-language-online`, `study-arabic-online`) into one strong pillar; 301 the rest to it. Duplicate thin pages actively suppress the whole domain.
- Repoint the survivors' internal links at the two hubs.

## Phase 4 — Authority & technical polish (ongoing)

- Backlinks: the profile is effectively empty, which is why nothing crosses position 15. Target expat-in-Dubai forums and communities, Arabic-learning subreddit resource lists, language-blog guest posts, and directory listings for the free Gulf lesson.
- Programmatic depth: generate indexable pages from the existing curriculum data (dialect → level → unit overviews) where the content is genuinely unique. Add these to the sitemap generator.
- Sitemap: `public/sitemap.xml` is currently hand-maintained and drifting from the routes. Move it to the generator script pattern so new pages and blog posts are picked up automatically.
- Core Web Vitals: the Houria page already uses `LiteYouTube` and split bundles — apply the same treatment to the two learn hubs.
- Add `Article` + `BreadcrumbList` JSON-LD to every blog post.

## Measurement

Track monthly: position of the 15 known keywords, indexed page count, referring domains, and free-lesson signups from organic. Realistic target: the two hubs into positions 5–10 within 3 months, first meaningful organic traffic by month 4.

## Technical notes

Nothing here requires new infrastructure. `SEOHead.tsx` already handles per-route title/description/canonical/OG/JSON-LD; `generateFAQPageSchema` and `generateCourseSchema` exist. Work is: content in `src/pages/learn/*` and `src/content/blog/*`, redirect handling in `FullAppRoutes.tsx`, and replacing the static `public/sitemap.xml` with `scripts/generate-sitemap.ts` wired to `predev`/`prebuild`.

Data source: Semrush (US database).
