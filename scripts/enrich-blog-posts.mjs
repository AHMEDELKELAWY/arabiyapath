// Idempotently enrich blog posts: add Related Reading + CTA block if missing.
// Does NOT modify thin/merge candidates' core content — only appends safe blocks.
import fs from 'fs';
import path from 'path';

const DIR = 'src/content/blog';
const FREE_LESSON = '/learn/lesson/d4e5f6a7-0101-0101-0101-000000000001';
const COURSE = '/gulf-arabic-course';

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
  return { meta, body: m ? m[2] : raw, fm: m ? m[1] : '' };
}

const posts = files.map(f => {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const { meta, body, fm } = parse(raw);
  return { file: f, slug: meta.slug || f.replace('.md',''), title: meta.title || '', body, fm };
});

// Topical groups for relevant related links
function relatedFor(slug) {
  const isGulf = /gulf|khaleeji|dubai|emirat|saudi|uae/.test(slug);
  const isOnline = /online|app|course|lesson|conversation|fast|beginner/.test(slug);
  const candidates = posts.filter(p => p.slug !== slug);
  const score = p => {
    let s = 0;
    if (isGulf && /gulf|khaleeji|dubai|saudi|uae|expat/.test(p.slug)) s += 3;
    if (isOnline && /online|app|course|lesson|conversation|fast|beginner/.test(p.slug)) s += 2;
    if (p.body.length > 3000) s += 1;
    return s;
  };
  return candidates.sort((a,b)=>score(b)-score(a)).slice(0, 3);
}

const MARK_RELATED = '<!-- enrich:related -->';
const MARK_CTA = '<!-- enrich:cta -->';

let changed = 0;
for (const p of posts) {
  let body = p.body;
  let dirty = false;

  if (!body.includes(MARK_RELATED)) {
    const rel = relatedFor(p.slug);
    const block = `\n\n${MARK_RELATED}\n## Related reading\n\n` +
      rel.map(r => `- [${r.title}](/blog/${r.slug})`).join('\n') + '\n';
    body = body.trimEnd() + block;
    dirty = true;
  }

  if (!body.includes(MARK_CTA)) {
    const block = `\n\n${MARK_CTA}\n## Start learning today\n\n` +
      `- 🎁 [Try a free Gulf Arabic lesson](${FREE_LESSON}) — no payment required.\n` +
      `- 📚 [Explore the full Gulf Arabic course](${COURSE}) — beginner to advanced, native audio, certificates.\n` +
      `- 🌍 [Browse all Arabic dialects](/dialects) and pick the one that matches your goals.\n`;
    body = body.trimEnd() + block + '\n';
    dirty = true;
  }

  if (dirty) {
    const out = `---\n${p.fm}\n---\n${body}`;
    fs.writeFileSync(path.join(DIR, p.file), out);
    changed++;
  }
}

console.log(`Enriched ${changed}/${posts.length} posts`);
