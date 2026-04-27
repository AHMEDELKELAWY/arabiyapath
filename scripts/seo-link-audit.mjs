import fs from 'fs';
import path from 'path';

const BLOG_DIR = 'src/content/blog';
const OUT_MD = '/mnt/documents/seo-internal-link-audit.md';
const OUT_JSON = '/mnt/documents/seo-internal-link-audit.json';

const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));

// Parse posts
const posts = files.map(f => {
  const raw = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = {};
  if (m) {
    m[1].split('\n').forEach(line => {
      const i = line.indexOf(':');
      if (i > 0) {
        let v = line.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        meta[line.slice(0, i).trim()] = v;
      }
    });
  }
  const content = m ? m[2] : raw;
  const slug = meta.slug || f.replace(/\.md$/, '');
  return { file: f, slug, title: meta.title || slug, content };
});

const knownBlogSlugs = new Set(posts.map(p => p.slug));

// Known site routes (from App router) — keep conservative; flag others as "external/site" not broken
const KNOWN_SITE_ROUTES = new Set([
  '/', '/about', '/blog', '/contact', '/dialects', '/faq', '/pricing', '/privacy', '/terms',
  '/login', '/signup', '/free-trial', '/free-gulf-lesson', '/gulf-arabic-course',
  '/learn/gulf-arabic', '/learn/fusha-arabic', '/learn/egyptian-arabic',
  '/become-affiliate', '/dashboard', '/checkout',
]);

// Extract markdown links [text](url)
const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;

const outgoing = {}; // slug -> [{text, url, targetSlug, type, broken}]
const incoming = {}; // slug -> [{from, text}]
posts.forEach(p => { outgoing[p.slug] = []; incoming[p.slug] = []; });

for (const p of posts) {
  let mm;
  const seen = new Set();
  while ((mm = linkRe.exec(p.content)) !== null) {
    const text = mm[1].trim();
    const url = mm[2].trim().split(' ')[0];
    if (!url.startsWith('/')) continue; // only internal
    const cleanUrl = url.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';

    let type = 'site';
    let targetSlug = null;
    let broken = false;

    if (cleanUrl.startsWith('/blog/')) {
      type = 'blog';
      targetSlug = cleanUrl.replace('/blog/', '');
      if (!knownBlogSlugs.has(targetSlug)) broken = true;
    } else if (cleanUrl === '/blog') {
      type = 'blog-index';
    } else if (KNOWN_SITE_ROUTES.has(cleanUrl)) {
      type = 'site';
    } else if (/^\/learn\//.test(cleanUrl) || /^\/dashboard/.test(cleanUrl)) {
      type = 'site';
    } else {
      // Unknown internal path — flag as potentially broken (no /blog/ prefix on a blog slug?)
      const maybeSlug = cleanUrl.replace(/^\//, '');
      if (knownBlogSlugs.has(maybeSlug)) {
        broken = true; // missing /blog/ prefix
        type = 'blog-missing-prefix';
        targetSlug = maybeSlug;
      } else {
        type = 'unknown';
        broken = true;
      }
    }

    outgoing[p.slug].push({ text, url, cleanUrl, type, targetSlug, broken });
    if (targetSlug && knownBlogSlugs.has(targetSlug)) {
      incoming[targetSlug].push({ from: p.slug, text });
    }
  }
}

// Anchor-text repetition analysis (per-post): same anchor text used 3+ times pointing to same target
const repetition = {};
for (const p of posts) {
  const groups = {};
  for (const l of outgoing[p.slug]) {
    if (l.type !== 'blog' && l.type !== 'site') continue;
    const key = `${l.text.toLowerCase()} -> ${l.cleanUrl}`;
    groups[key] = (groups[key] || 0) + 1;
  }
  const flags = Object.entries(groups).filter(([, c]) => c >= 3).map(([k, c]) => ({ pair: k, count: c }));
  if (flags.length) repetition[p.slug] = flags;
}

// Site-wide: same anchor text used for many different targets, or one target with only 1 anchor variant from many sources
const anchorByTarget = {}; // target -> {anchorText -> count}
for (const [from, links] of Object.entries(outgoing)) {
  for (const l of links) {
    if (!l.targetSlug || l.broken) continue;
    anchorByTarget[l.targetSlug] = anchorByTarget[l.targetSlug] || {};
    const k = l.text.toLowerCase();
    anchorByTarget[l.targetSlug][k] = (anchorByTarget[l.targetSlug][k] || 0) + 1;
  }
}
const lowDiversity = [];
for (const [target, anchors] of Object.entries(anchorByTarget)) {
  const total = Object.values(anchors).reduce((a, b) => a + b, 0);
  const variants = Object.keys(anchors).length;
  if (total >= 4 && variants <= 2) {
    lowDiversity.push({ target, total, variants, anchors });
  }
}

// Orphans / weak pages
const orphans = posts.filter(p => incoming[p.slug].length === 0).map(p => p.slug);
const noOutgoingBlog = posts.filter(p => outgoing[p.slug].filter(l => l.type === 'blog').length === 0).map(p => p.slug);

// Build report
let md = `# SEO Internal Link Audit\n\nGenerated: ${new Date().toISOString()}\n\n`;
md += `**Total blog posts:** ${posts.length}\n\n`;

const totalLinks = Object.values(outgoing).reduce((a, l) => a + l.length, 0);
const brokenLinks = Object.values(outgoing).flat().filter(l => l.broken);
md += `**Total internal links:** ${totalLinks}\n`;
md += `**Broken / suspicious links:** ${brokenLinks.length}\n`;
md += `**Orphan posts (0 incoming):** ${orphans.length}\n`;
md += `**Posts with 0 outgoing blog links:** ${noOutgoingBlog.length}\n\n`;

md += `---\n\n## 🚨 Broken or Suspicious Links\n\n`;
if (!brokenLinks.length) md += `_None found._\n\n`;
else {
  md += `| From | Anchor | URL | Issue |\n|---|---|---|---|\n`;
  for (const [from, links] of Object.entries(outgoing)) {
    for (const l of links) if (l.broken) {
      const issue = l.type === 'blog-missing-prefix' ? 'Missing `/blog/` prefix' : (l.type === 'unknown' ? 'Unknown route' : 'Broken slug');
      md += `| \`${from}\` | ${l.text} | \`${l.url}\` | ${issue} |\n`;
    }
  }
  md += `\n`;
}

md += `## 🔁 Repetitive Anchor Text (per post, ≥3 same anchor→target)\n\n`;
if (!Object.keys(repetition).length) md += `_None found._\n\n`;
else {
  for (const [slug, flags] of Object.entries(repetition)) {
    md += `**\`${slug}\`**\n`;
    for (const f of flags) md += `- ${f.count}× — ${f.pair}\n`;
    md += `\n`;
  }
}

md += `## ⚠️ Low Anchor-Text Diversity (site-wide)\n\nTargets with ≥4 incoming links but ≤2 distinct anchor variants.\n\n`;
if (!lowDiversity.length) md += `_None found._\n\n`;
else {
  for (const r of lowDiversity) {
    md += `- \`/blog/${r.target}\` — ${r.total} links, ${r.variants} variant(s): ${Object.entries(r.anchors).map(([a, c]) => `"${a}" (${c})`).join(', ')}\n`;
  }
  md += `\n`;
}

md += `## 👻 Orphan Posts (0 incoming internal links)\n\n`;
if (!orphans.length) md += `_None._\n\n`;
else orphans.forEach(s => md += `- \`${s}\`\n`);
md += `\n`;

md += `## 🕳️ Posts with No Outgoing Blog Links\n\n`;
if (!noOutgoingBlog.length) md += `_None._\n\n`;
else noOutgoingBlog.forEach(s => md += `- \`${s}\`\n`);
md += `\n---\n\n## 📄 Per-Post Breakdown\n\n`;

const sorted = [...posts].sort((a, b) => a.slug.localeCompare(b.slug));
for (const p of sorted) {
  const out = outgoing[p.slug];
  const inc = incoming[p.slug];
  const blogOut = out.filter(l => l.type === 'blog');
  const siteOut = out.filter(l => l.type === 'site' || l.type === 'blog-index');
  md += `### \`${p.slug}\`\n`;
  md += `**Title:** ${p.title}\n\n`;
  md += `**Incoming:** ${inc.length} | **Outgoing:** ${out.length} (blog: ${blogOut.length}, site: ${siteOut.length}, broken: ${out.filter(l=>l.broken).length})\n\n`;

  md += `**Incoming links (${inc.length}):**\n`;
  if (!inc.length) md += `- _none_\n`;
  else inc.forEach(i => md += `- from \`${i.from}\` — "${i.text}"\n`);
  md += `\n**Outgoing links (${out.length}):**\n`;
  if (!out.length) md += `- _none_\n`;
  else out.forEach(l => md += `- ${l.broken ? '❌ ' : ''}[${l.type}] "${l.text}" → \`${l.url}\`\n`);
  md += `\n`;
}

fs.writeFileSync(OUT_MD, md);
fs.writeFileSync(OUT_JSON, JSON.stringify({ posts: posts.map(p => ({ slug: p.slug, title: p.title })), outgoing, incoming, repetition, lowDiversity, orphans, noOutgoingBlog, brokenLinks }, null, 2));

console.log('Wrote', OUT_MD);
console.log('Wrote', OUT_JSON);
console.log('Posts:', posts.length, '| Links:', totalLinks, '| Broken:', brokenLinks.length, '| Orphans:', orphans.length);
