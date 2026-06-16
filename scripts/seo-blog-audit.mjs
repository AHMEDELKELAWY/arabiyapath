// Blog SEO audit: detect thin/duplicate/cannibalized posts, anchor-tag rendering issues,
// and emit a human-readable report to /mnt/documents/blog-seo-audit.md.
import fs from 'fs';
import path from 'path';

const DIR = 'src/content/blog';
const OUT = '/mnt/documents/blog-seo-audit.md';

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md'));

function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = {};
  if (m) m[1].split('\n').forEach(l => {
    const i = l.indexOf(':'); if (i < 0) return;
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    meta[l.slice(0, i).trim()] = v;
  });
  return { meta, body: m ? m[2] : raw };
}

const posts = files.map(f => {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const { meta, body } = parse(raw);
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const h2Count = (body.match(/^##\s+/gm) || []).length;
  const hasImage = /!\[[^\]]*\]\(/.test(body);
  const hasFAQ = /##\s+(FAQ|Frequently Asked Questions|FAQs)/i.test(body);
  const hasFreeLessonLink = /\/learn\/lesson\/d4e5f6a7/.test(body) || /free-gulf-lesson/.test(body);
  const hasCourseLink = /\/gulf-arabic-course|\/learn\/gulf-arabic|\/learn\/fusha-arabic|\/pricing/.test(body);
  const internalLinks = [...body.matchAll(/\[[^\]]+\]\((\/[^)\s]+)\)/g)].map(m => m[1]);
  const blogLinks = internalLinks.filter(u => u.startsWith('/blog/'));
  const visibleAnchors = (body.match(/<a\s+(?:id|name)=/gi) || []).length;
  // tokens for cannibalization
  const tokens = body.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 3);
  const grams = new Set();
  for (let i = 0; i < tokens.length - 3; i++) grams.add(tokens.slice(i, i + 4).join(' '));
  return { file: f, slug: meta.slug || f.replace('.md',''), title: meta.title || '', desc: meta.description || '',
    wordCount, h2Count, hasImage, hasFAQ, hasFreeLessonLink, hasCourseLink,
    internalLinkCount: internalLinks.length, blogLinkCount: blogLinks.length,
    visibleAnchors, grams };
});

// Overlap matrix
const overlap = {};
for (const a of posts) {
  overlap[a.slug] = {};
  for (const b of posts) {
    if (a.slug === b.slug) continue;
    let inter = 0;
    for (const g of a.grams) if (b.grams.has(g)) inter++;
    const j = inter / Math.max(1, Math.min(a.grams.size, b.grams.size));
    overlap[a.slug][b.slug] = j;
  }
}

// Classify
const thin = posts.filter(p => p.wordCount < 600);
const expand = posts.filter(p => p.wordCount >= 600 && p.wordCount < 900);
const noImage = posts.filter(p => !p.hasImage);
const noCTA = posts.filter(p => !p.hasFreeLessonLink || !p.hasCourseLink);
const noFAQ = posts.filter(p => !p.hasFAQ);
const anchorIssues = posts.filter(p => p.visibleAnchors > 0);

// Cannibalization clusters: edges with overlap >= 0.35
const edges = [];
for (const a of posts) for (const b of posts) {
  if (a.slug >= b.slug) continue;
  const j = overlap[a.slug][b.slug];
  if (j >= 0.35) edges.push({ a: a.slug, b: b.slug, j });
}
edges.sort((x, y) => y.j - x.j);

// Union-find clusters
const parent = {};
posts.forEach(p => parent[p.slug] = p.slug);
const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
const union = (x, y) => { const rx = find(x), ry = find(y); if (rx !== ry) parent[rx] = ry; };
edges.forEach(e => union(e.a, e.b));
const clusters = {};
posts.forEach(p => { const r = find(p.slug); (clusters[r] = clusters[r] || []).push(p.slug); });
const mergeGroups = Object.values(clusters).filter(c => c.length > 1);

let md = `# Blog SEO Audit Report\n\nGenerated: ${new Date().toISOString()}\n\n`;
md += `**Total posts:** ${posts.length}\n`;
md += `**Median word count:** ${[...posts].sort((a,b)=>a.wordCount-b.wordCount)[Math.floor(posts.length/2)].wordCount}\n\n`;
md += `## Summary\n\n`;
md += `| Issue | Count |\n|---|---|\n`;
md += `| Thin (<600 words) | ${thin.length} |\n`;
md += `| Needs expansion (600–900) | ${expand.length} |\n`;
md += `| Missing hero image | ${noImage.length} |\n`;
md += `| Missing free-lesson or course CTA | ${noCTA.length} |\n`;
md += `| No FAQ section | ${noFAQ.length} |\n`;
md += `| Visible raw <a> anchor tags | ${anchorIssues.length} |\n`;
md += `| Cannibalization cluster pairs (≥35% 4-gram overlap) | ${edges.length} |\n`;
md += `| Merge candidate groups | ${mergeGroups.length} |\n\n`;

md += `## 🪶 Low-Value Posts (thin content, <600 words)\n\n`;
if (!thin.length) md += `_None._\n\n`;
else { md += `| Slug | Words | H2s | Images | CTA | Recommendation |\n|---|---:|---:|:-:|:-:|---|\n`;
  thin.forEach(p => md += `| \`${p.slug}\` | ${p.wordCount} | ${p.h2Count} | ${p.hasImage?'✅':'❌'} | ${(p.hasFreeLessonLink&&p.hasCourseLink)?'✅':'❌'} | Expand to 1,200+ words or merge into a stronger sibling |\n`);
  md += `\n`; }

md += `## 📈 Posts Needing Expansion (600–900 words)\n\n`;
if (!expand.length) md += `_None._\n\n`;
else { md += `| Slug | Words | Blog links out | Recommendation |\n|---|---:|---:|---|\n`;
  expand.forEach(p => md += `| \`${p.slug}\` | ${p.wordCount} | ${p.blogLinkCount} | Add 2–3 new sections, examples, FAQ block, related-post links |\n`);
  md += `\n`; }

md += `## 🔀 Merge Candidates / Keyword Cannibalization\n\n`;
md += `Posts in the same cluster compete for the same query intent. Pick one as canonical, redirect the others or rewrite to target distinct long-tails.\n\n`;
if (!mergeGroups.length) md += `_No clusters detected._\n\n`;
else mergeGroups.forEach((g, i) => {
  const ranked = g.map(s => posts.find(p => p.slug === s)).sort((a,b)=>b.wordCount-a.wordCount);
  md += `### Cluster ${i + 1} (${g.length} posts) — recommended canonical: \`${ranked[0].slug}\`\n`;
  ranked.forEach(p => md += `- \`${p.slug}\` — ${p.wordCount} words — _${p.title}_\n`);
  md += `\n`;
});

md += `## 🔁 Highest-Overlap Pairs (top 15)\n\n| A | B | 4-gram overlap |\n|---|---|---:|\n`;
edges.slice(0, 15).forEach(e => md += `| \`${e.a}\` | \`${e.b}\` | ${(e.j*100).toFixed(0)}% |\n`);
md += `\n`;

md += `## 🏷️ Anchor-Tag Rendering Issues\n\nRaw \`<a id="…">\` tags rendered as visible text in the article body.\n\n`;
if (!anchorIssues.length) md += `_None._\n\n`;
else { md += `| Slug | Raw anchors |\n|---|---:|\n`;
  anchorIssues.forEach(p => md += `| \`${p.slug}\` | ${p.visibleAnchors} |\n`);
  md += `\n_Fixed at render time in \`src/pages/BlogPost.tsx\` — empty anchors are now hidden but keep their id for TOC jumps._\n\n`; }

md += `## 🖼️ Posts Missing Hero Image\n\n`;
noImage.forEach(p => md += `- \`${p.slug}\`\n`);
md += `\n## 🎯 Posts Missing Free-Lesson or Course CTA\n\n`;
noCTA.forEach(p => md += `- \`${p.slug}\` (free-lesson: ${p.hasFreeLessonLink?'✅':'❌'}, course: ${p.hasCourseLink?'✅':'❌'})\n`);
md += `\n## ❓ Posts Missing FAQ Section\n\n`;
noFAQ.forEach(p => md += `- \`${p.slug}\`\n`);

md += `\n## 📄 All Posts\n\n| Slug | Words | H2s | Img | FAQ | Free CTA | Course CTA | Anchors |\n|---|---:|---:|:-:|:-:|:-:|:-:|---:|\n`;
[...posts].sort((a,b)=>a.slug.localeCompare(b.slug)).forEach(p =>
  md += `| \`${p.slug}\` | ${p.wordCount} | ${p.h2Count} | ${p.hasImage?'✅':'❌'} | ${p.hasFAQ?'✅':'❌'} | ${p.hasFreeLessonLink?'✅':'❌'} | ${p.hasCourseLink?'✅':'❌'} | ${p.visibleAnchors} |\n`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log('Wrote', OUT);
console.log({ posts: posts.length, thin: thin.length, expand: expand.length, merge: mergeGroups.length, anchors: anchorIssues.length });
