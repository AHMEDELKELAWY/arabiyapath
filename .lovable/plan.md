## Where the site stands (Semrush, US database, today)

- 16 organic keywords, ~1 estimated visit/month. Indexed, nothing on page 1 yet.
- All rankings sit on two pages: `/learn/fusha-arabic` and `/learn/gulf-arabic`. The 25+ blog posts rank for nothing measurable.
- Closest wins: `fusha` (4,400/mo) at #19 · `fusha arabic` (720/mo) at #18 · `fus ha` (260/mo) at #20 · `arabic khaleeji` (90/mo) at #20 · `fusha in arabic` (140/mo) at #22 · `learn fusha arabic` (30/mo) at #23 · `what is fusha arabic` (40/mo) at #16.
- Mid-page-3 opportunities: `khaliji arabic` (260/mo) #28 · `khaleeji arabic` (110/mo) #31 · `fusha arabic alphabet` (50/mo) #31 · `gulf arabic dialect` (320/mo) #40.

Read: technical SEO is solid (Helmet per-route meta, JSON-LD, sitemap, robots). The gap is **topical depth on the two themes that already rank** and **near-zero authority**. Positions 16–23 are the fastest money.

## Strategy

Own two clusters instead of chasing generic "learn arabic online" head terms (what most existing blog posts do, ranking for nothing):

1. **Fusha / MSA** — strongest current signal, feeds Spoken Arabic + vocabulary products.
2. **Khaleeji / Gulf Arabic** — least contested niche in the data, and the paid product.

## Phase 1 — Harvest existing rankings (weeks 1–2)

- `/learn/fusha-arabic`: expand for `fusha`, `fusha arabic`, `fus ha`, `fusha in arabic`, `what is fusha arabic`, `learn fusha arabic`. Add a direct-answer "What is Fusha Arabic?" block (40 words, first screen), a Fusha-vs-dialect comparison table, and an alphabet section.
- `/learn/gulf-arabic`: expand for `khaliji arabic`, `khaleeji arabic`, `arabic khaleeji`, `gulf arabic dialect`, `khaleeji meaning in arabic`. Add a "Khaleeji meaning" answer block and a country-by-country breakdown (UAE, Saudi, Qatar, Kuwait, Bahrain, Oman).
- Ensure `FAQPage` + `Course` JSON-LD on both (helpers exist in `SEOHead.tsx`).
- Internal-link into both hubs from the homepage and every relevant blog post with descriptive anchors.

## Phase 2 — Build the two clusters (weeks 3–8)

New supporting pages, each linking up to its hub, ~1,200–1,800 words, one H1, direct answer in the first 60 words, FAQ block with schema, CTA into the free-lesson funnel.

- **Fusha:** Fusha Arabic alphabet (full guide) · Fusha vs Ammiyya · MSA grammar basics for beginners · Fusha pronunciation · Learn to read Arabic in 30 days · "Fusha translator" intent page (currently #24).
- **Gulf:** Khaleeji vs Egyptian · Gulf Arabic alphabet & pronunciation · Emirati vs Saudi vs Kuwaiti · 100 Gulf Arabic phrases · Gulf Arabic numbers · Is Gulf Arabic hard to learn?
- **One high-traffic adjacent asset:** a 99 Names of Allah (Asma ul Husna) guide at `/learn/99-names-of-allah` — Arabic text, transliteration, meanings. It drives >6% of a top competitor's organic traffic.

## Phase 3 — Fix the existing blog (weeks 3–4, parallel)

- Keep and rewrite the posts that fit the clusters (`learn-gulf-arabic-online`, `gulf-vs-fusha-arabic`, `fusha-vs-gulf-arabic`, `why-learn-gulf-arabic`, `fusha-arabic-alphabet`, `khaleeji-vs-egyptian-arabic`).
- Consolidate the near-duplicate head-term posts (`learn-arabic-online`, `learn-arabic-language-online`, `learnarabiconline`, `arabic-language-online`, `study-arabic-online`, `arabic-lessons-online`, `online-arabic-classes`) into one pillar; 301 the rest via `src/content/blog/redirects.ts`. Thin duplicates suppress the whole domain.
- Repoint surviving internal links at the two hubs. Confirm `Article` + `BreadcrumbList` JSON-LD on every post.

## Phase 4 — Authority, indexing & polish (ongoing)

- **Google Search Console** is not connected — connect it, verify `https://arabiyapath.com/`, and submit the sitemap. Without it there is no query, coverage, or indexing data at all.
- **Backlinks** are effectively zero, which is why nothing crosses position 15: expat-in-Dubai/Saudi forums, r/learn_arabic resource lists, language-blog guest posts, directory listings for the free Gulf lesson.
- **Sitemap:** `public/sitemap.xml` is hand-maintained and drifting. Move to `scripts/generate-sitemap.ts` wired to `predev`/`prebuild` so new pages and posts are picked up automatically.
- **Metadata hygiene:** shorten meta descriptions on `Pricing.tsx` and `GulfArabicCourse.tsx` to under 160 chars.
- **Content hygiene:** fix the H1→H3 heading skip in `ContactMethods.tsx`.
- **AI search:** add `public/llms.txt` listing public pages only (no admin, auth, or dashboard routes).
- **Core Web Vitals:** apply the `LiteYouTube` + split-bundle treatment already used on the Houria page to the two learn hubs.

## Measurement

Monthly: positions of the 16 known keywords, indexed page count (via Search Console once connected), referring domains, and free-lesson signups from organic. Realistic target: both hubs into positions 5–10 within 3 months, first meaningful organic traffic by month 4.

## Technical notes

No new infrastructure needed. Work lands in `src/pages/learn/*`, `src/content/blog/*`, redirects in `src/content/blog/redirects.ts` / `FullAppRoutes.tsx`, and replacing the static sitemap with the generator script. `SEOHead.tsx` already handles per-route title/description/canonical/OG/JSON-LD; `generateFAQPageSchema`, `generateCourseSchema`, and `generateBreadcrumbListSchema` exist.

Note: this is a client-rendered SPA, so social-preview crawlers see only the static `index.html` head. Per-page social previews would need SSR — the app can get that by upgrading to Lovable's latest template ([what the upgrade gives you](https://lovable.dev/blog/building-apps-using-tanstack-start)).

Data sources: Semrush (US database) and the SEO scan now running.
