# ArabiyaPath — Complete SEO Plan

## 1. Where we stand (Semrush snapshot, US database)

| Metric | Value | Read |
|---|---|---|
| Authority Score | **2/100** | Brand-new domain in Google's eyes. |
| Referring domains | 13 (mostly spam/PBN anchors) | Toxic anchor text — needs disavow. |
| Indexed keywords | 18 | Only 2 pages ranking: `/learn/gulf-arabic` and `/learn/fusha-arabic`. |
| Best position | #16 ("what is fusha arabic") | Nothing on page 1 yet. |
| Est. organic traffic | 0/mo | No clicks. |
| Top competitor | playaling.com (7.9K/mo, AS higher) | Big-site territory. Realistic peers: al-fusha.com, yallakhaleeji.com, fusha-connect.ca. |

Diagnosis: solid indexation, decent product content, but (a) no topical depth around the money keywords, (b) a spammy backlink profile hurting trust, (c) title/description/canonical hygiene issues to sweep, (d) the two ranking pages sit at positions 16–65 and just need on-page + internal-link work to move to page 1.

## 2. Strategy — three horizons

**Horizon 1 (0–30 days) — Fix the foundation.** Technical SEO, on-page hygiene, schema, disavow spam links, ship 3 pillar rewrites.

**Horizon 2 (30–90 days) — Win the dialect niche.** Publish a keyword-clustered content hub around "learn Gulf/Fusha Arabic", strengthen internal linking, earn first quality backlinks, launch programmatic city/audience pages.

**Horizon 3 (90–180 days) — Scale.** Blog velocity of 2–3 posts/week, guest posts on expat/language sites, YouTube→site funnel, review signals, EEAT authorship.

## 3. Horizon 1 — Foundation fixes

### 3.1 Technical
- Audit `index.html` head: real title, description, `og:*`, `twitter:card`, favicon set ✅ (already done).
- Per-route `<Helmet>` on every public page — audit `SEOHead` coverage on: `/`, `/pricing`, `/flashcards`, `/flashcards/level/*`, `/blog/*`, `/learn/*`, `/free-gulf-lesson`, `/become-affiliate`, `/faq`, `/contact`.
- Confirm every route's `canonical` and `og:url` self-reference (no homepage fallback).
- Robots: keep `/admin/`, `/dashboard/`, `/checkout`, `/payment/` blocked (already done). Add `Disallow: /flashcards/study/`, `/flashcards/unit/`, `/partner/`.
- Sitemap: switch to a generator script that pulls blog posts + published units from `content/blog` and DB. Currently hand-edited — will drift.
- Core Web Vitals: LiteYouTube is live on Houria — extend to any other YouTube embed (home, dialect landings). Convert hero images to `<img loading="eager" fetchpriority="high">` above-the-fold, everything else `loading="lazy"`.
- 404s: verify `/learn/egyptian-arabic` still noindex; add `410` behavior for removed URLs via `NotFound`.

### 3.2 On-page — rewrite the two ranking pages first (fastest lift)
Positions 16–30 with 500–4,400/mo volume are the biggest unclaimed wins.

**`/learn/fusha-arabic`** — target cluster: *fusha, fusha arabic, learn fusha arabic, what is fusha arabic, fusha vs …*
- H1: "Learn Fusha Arabic (Modern Standard Arabic) Online"
- Add sections: "What is Fusha?", "Fusha vs dialect", "Fusha alphabet", "How long to learn Fusha", FAQ, course CTA.
- 1,500–2,000 words, one embedded native-audio sample, `Course` + `FAQPage` JSON-LD (already scaffolded — verify it fires).

**`/learn/gulf-arabic`** — target: *gulf arabic dialect, khaleeji arabic, learn gulf arabic, arabic khaleeji, gulf arabic vs fusha.*
- Same treatment. Include a "Gulf Arabic for expats in Dubai/Riyadh" section — funnels to existing blog posts.

### 3.3 Schema (JSON-LD)
- Sitewide: `Organization` + `WebSite` with `SearchAction`.
- Course pages: `Course` (name, description, provider, inLanguage, hasCourseInstance with price).
- Blog: `Article` + `BreadcrumbList` per post. Verify `BlogPost.tsx` emits `datePublished`, `author`, `image`.
- Pricing: `Product` + `Offer` with `price`, `priceCurrency`, `availability`.
- FAQ: `FAQPage` on `/faq` and dialect pages.
- Reviews: add `AggregateRating` once you have ≥5 real testimonials.

### 3.4 Backlink cleanup
- Export the 16 backlinks from Semrush. The anchors show classic PBN spam ("high quality dofollow backlinks…", "fiverr"). File a **disavow** in Google Search Console for the toxic domains: 8coint.com, toplikevideo.com, fittyfoody.com, fiverr-seo-for-business-growth.site, ggmap.co.com, dailymusings.top, metamagic.top, bisprofit.com.

## 4. Horizon 2 — Topical authority hub (30–90 days)

### 4.1 Pillar + cluster map

```text
PILLAR: /learn/gulf-arabic  (target: "learn gulf arabic")
├─ /blog/khaleeji-arabic-explained         (khaleeji arabic, 260)
├─ /blog/gulf-arabic-alphabet              (existing gulf posts)
├─ /blog/gulf-arabic-phrases-for-work-dubai
├─ /blog/gulf-arabic-vs-egyptian
└─ /blog/best-way-to-learn-gulf-arabic

PILLAR: /learn/fusha-arabic  (target: "fusha arabic", 4,400)
├─ /blog/fusha-vs-ammiya
├─ /blog/fusha-arabic-alphabet             (KW volume 50)
├─ /blog/learn-fusha-arabic-for-beginners
├─ /blog/how-long-to-learn-fusha
└─ /blog/best-fusha-textbooks

PILLAR: /flashcards  (target: "arabic flashcards", "msa vocabulary")
├─ /blog/msa-arabic-vocabulary-list
├─ /blog/best-arabic-flashcard-app
└─ /blog/spaced-repetition-arabic
```

Every cluster post links up to its pillar with keyword-rich anchor, and pillar links down to every cluster. This is the single biggest lever for a young domain.

### 4.2 Programmatic pages (medium priority)
`/learn/gulf-arabic/for-<audience>` — expats, engineers, teachers, doctors, tourists — each 800 words with audience-specific vocab preview + course CTA. Use existing blog structure. Start with 5 audiences.

### 4.3 Link building
- **Guest posts**: expat blogs in UAE/KSA/Qatar, language-learning roundups (Fluent in 3 Months, All Language Resources), student communities.
- **Free tool**: publish an "Arabic name transliterator" or "Arabic alphabet trainer" as a linkable asset.
- **HARO / Qwoted**: pitch on "learning Arabic" queries — the founder becomes the quoted expert.
- **Directory listings**: language school directories, Course Report equivalents.
- **YouTube Shorts**: keep publishing (Houria video is already embedded) — description links back to the pillar page.

### 4.4 Internal linking rules
- Every blog post: 3+ contextual links to pillar or cluster siblings.
- Navbar: add a "Learn" mega-menu with Gulf / Fusha / Egyptian → drops CTR on the two money pages.
- Footer: add a "Popular topics" column with 6–10 cluster-page anchors.

## 5. Horizon 3 — Scale (90–180 days)

- **Blog velocity**: 2–3 posts/week using the cluster map. Existing `scripts/enrich-blog-posts.mjs` can help.
- **EEAT**: add author bios (native speaker credentials), publish/updated dates on every post, "reviewed by" line for course pages.
- **International SEO**: consider `/ar/` prefix for Arabic-language pages targeting SA/AE/EG databases where you already show ranking signal. Add `hreflang` on translated pages.
- **Reviews**: collect Trustpilot / G2 reviews → adds `AggregateRating` schema and social proof.
- **YouTube channel**: transcribe lessons → embed transcripts on blog posts (fresh content + video schema).
- **Search Console monitoring**: weekly review of top queries, CTR, position. Rewrite titles on any page averaging position 6–12 with CTR <3%.

## 6. Measurement

Track monthly in Google Search Console + Semrush:
- Impressions and clicks (baseline: currently ~0).
- # of keywords in top-10 (baseline: 0 → target 20 by day 90, 100 by day 180).
- Authority Score (baseline 2 → target 15 by day 180).
- Referring domains — quality, not count.
- Conversion rate: organic → signup → paid membership.

## 7. Execution — what I'd ship in code next

If you want, I can start immediately on any of these — each is a self-contained PR:

1. **Sitemap generator** (`scripts/generate-sitemap.ts` + `predev`/`prebuild` hooks) that pulls blog posts and DB units.
2. **SEOHead audit** — sweep every route, add missing `<Helmet>` blocks and JSON-LD.
3. **Rewrite `/learn/fusha-arabic`** with the 2K-word structure above (biggest single traffic win).
4. **Rewrite `/learn/gulf-arabic`** likewise.
5. **Mega-menu Navbar** with Learn → Gulf / Fusha, plus footer "Popular topics" for internal linking.
6. **Programmatic audience pages** under `/learn/gulf-arabic/for-*`.

Tell me which one to start with — I recommend #1 → #3 → #4 → #2 in that order.
