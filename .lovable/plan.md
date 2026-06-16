# Blog SEO Improvement Plan

23 blog posts exist. Several are clearly programmatic SEO variants of the same intent (e.g. `learn-arabic-online`, `learnarabiconline`, `arabic-language-online`, `study-arabic-online`, `learn-arabic-language-online`, `learn-arabic-online-course`, `online-arabic-classes`, `arabic-lessons-online`, `arabic-online-course`). Multiple Gulf-expat posts also overlap. The plan tackles audit + fixes in one pass, then a written report.

## 1. Audit & Report (no content deleted yet)

Build `scripts/seo-blog-audit.mjs` that computes per-post:
- word count, H2 count, unique 4-gram overlap vs. every other post (cannibalization / duplicate signal)
- target keyword (from title/slug) and keyword overlap groups
- visible raw HTML anchor tags (`<a …>`) inside markdown body
- presence of images, internal links, FAQ block, CTA

Output `/mnt/documents/blog-seo-audit.md` with three labeled sections:
- **Low-value posts** (thin: < 600 words, or > 60% n-gram overlap with another post)
- **Posts needing expansion** (600–900 words, weak link graph, no images)
- **Merge candidates** (clusters of near-duplicate intent → recommended canonical target)

This is the deliverable report the user asked for. **No posts are deleted or merged in code** — the report just recommends.

## 2. Fix article rendering

Problem: raw `<a name="…">` / `<a id="…">` anchors render as visible text in some posts.

In `src/pages/BlogPost.tsx`, extend the `ReactMarkdown` `components` map:
- `a`: if `href` is missing/empty and children is empty (TOC anchor target), render an invisible `<span id={name}>` so in-page TOC jump links keep working but nothing visible appears.
- Allow raw HTML via `rehype-raw` only for whitelisted tags (already needed for anchors). Strip stray `<a name>` tags by transforming them to ids on the next heading via a small rehype plugin — simpler: just hide empty anchors with CSS-equivalent: render `null` children.

Also sweep `src/content/blog/*.md` and convert legacy `<a name="x"></a>` to `{#x}` heading-id syntax on the following heading (remark-gfm + `rehype-slug` reads heading ids). Add `rehype-slug` + `rehype-autolink-headings` so every H2/H3 gets a stable, clickable id — TOC works site-wide without manual anchors.

## 3. Enrich every post

For each `.md` file, ensure (idempotent edits):
- **Hero image**: add `![alt](path)` near the top using existing brand imagery in `src/assets/` (no new image generation — reuse).
- **Internal links block** ("Related reading"): 3 links to genuinely related posts (chosen from audit clusters, not the same anchor text every time → anchor-text diversity).
- **Course / Free Lesson / Flash Cards CTA block** at the end:
  - Free lesson → `FREE_LESSON_URL` constant
  - Gulf course → `/gulf-arabic-course`
  - Flash cards → `/flashcards` (verify route exists; if not, link to `/dialects`)
- Implemented as a shared markdown snippet appended only when missing (script idempotency check).

## 4. Structured data

In `src/pages/BlogPost.tsx`, the `BlogPosting` JSON-LD already exists. Add alongside it:
- **BreadcrumbList**: Home → Blog → Post (use `generateBreadcrumbListSchema` from `src/lib/seo/breadcrumbs.ts`)
- **FAQPage**: only when the post has an `## FAQ` (or `## Frequently Asked Questions`) section — parse Q/A pairs from the markdown and emit via `generateFAQPageSchema`. Skip otherwise (don't fabricate FAQs).

Pass all three schemas as a `jsonLd` array to `SEOHead`.

## 5. Out of scope (per user)

- No new posts.
- No deletions/merges in this pass — report only; user decides.
- No image generation; reuse existing assets.

## Technical notes

- Packages: `rehype-raw`, `rehype-slug`, `rehype-autolink-headings` (add to `package.json`).
- Audit script: pure Node, reads `src/content/blog/*.md`, writes to `/mnt/documents/`.
- Enrichment script: edits markdown in place; safe to re-run.
- Flash Cards route: verify in `src/App.tsx` before linking.

## Deliverables

1. `scripts/seo-blog-audit.mjs` + report at `/mnt/documents/blog-seo-audit.md`
2. Updated `src/pages/BlogPost.tsx` (rendering fix + schemas)
3. `scripts/enrich-blog-posts.mjs` (one-shot run) + updated markdown files
4. New deps in `package.json`
