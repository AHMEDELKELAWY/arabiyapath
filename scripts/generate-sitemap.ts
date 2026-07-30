// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
//
// Static routes are listed below. Blog posts are discovered automatically from
// src/content/blog/*.md so new posts never need a manual sitemap edit.

import { readFileSync, readdirSync, writeFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = "https://arabiyapath.com"

interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

/**
 * Slugs that were consolidated into a stronger pillar page. They redirect and
 * must never appear in the sitemap.
 */
const RETIRED_BLOG_SLUGS = new Set([
  "learn-arabic-language-online",
  "learnarabiconline",
  "arabic-language-online",
  "study-arabic-online",
])

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/pricing", changefreq: "weekly", priority: "0.9" },
  { path: "/signup", changefreq: "monthly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/become-affiliate", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },

  // Funnels
  { path: "/free-gulf-lesson", changefreq: "monthly", priority: "0.8" },

  // Dialect hubs — the two pages that carry the site's organic rankings
  { path: "/dialects", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/gulf-arabic", changefreq: "weekly", priority: "1.0" },
  { path: "/learn/fusha-arabic", changefreq: "weekly", priority: "1.0" },
  { path: "/learn/99-names-of-allah", changefreq: "monthly", priority: "0.8" },

  // Products
  { path: "/flashcards", changefreq: "weekly", priority: "0.9" },

  // Blog index
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
]

function readBlogEntries(): SitemapEntry[] {
  const dir = resolve("src/content/blog")
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"))
  const entries: SitemapEntry[] = []

  for (const file of files) {
    const raw = readFileSync(resolve(dir, file), "utf8")
    const fm = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) continue

    const meta: Record<string, string> = {}
    for (const line of fm[1].split("\n")) {
      const i = line.indexOf(":")
      if (i <= 0) continue
      let value = line.slice(i + 1).trim()
      if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1)
      meta[line.slice(0, i).trim()] = value
    }

    const slug = meta.slug || file.replace(/\.md$/, "")
    if (RETIRED_BLOG_SLUGS.has(slug)) continue

    entries.push({
      path: `/blog/${slug}`,
      // `date` is the post's own publication date — a page-specific timestamp.
      lastmod: /^\d{4}-\d{2}-\d{2}/.test(meta.date || "") ? meta.date.slice(0, 10) : undefined,
      changefreq: "monthly",
      priority: "0.7",
    })
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path))
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

const entries = [...staticEntries, ...readBlogEntries()]
writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries) + "\n")
console.log(`sitemap.xml written (${entries.length} entries)`)
