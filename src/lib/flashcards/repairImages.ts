/**
 * Admin-side flashcard image repair + integrity scan.
 *
 * Step A: rows with image_url but no thumbnail_url → regenerate thumbnail
 *         and dimensions from the existing original image.
 * Step B: rows with image_url IS NULL → look for a file in the unit's
 *         storage folder whose filename ends in the card's order_index.
 *         If found, rebuild image_url + thumbnail_url from it.
 *
 * Step C (scan): integrity report over every flashcard.
 */

import { supabase } from "@/integrations/supabase/client";
import { compressFlashcardImage } from "./imageCompress";
import { writeAndVerify } from "./imageWrite";

const BUCKET = "content";

export interface CardLite {
  id: string;
  unit_id: string;
  order_index: number;
  kind: string;
  image_url: string | null;
  thumbnail_url: string | null;
  image_width: number | null;
  image_height: number | null;
  image_size_kb: number | null;
  english_translation: string | null;
}

export interface UnitLite {
  id: string;
  slug: string | null;
  title_en: string | null;
}

export interface RepairStepResult {
  cardId: string;
  unitSlug: string | null;
  order_index: number;
  kind: string;
  status: "repaired" | "skipped" | "failed";
  message?: string;
}

export interface RepairSummary {
  thumbnailsRepaired: number;
  thumbnailsFailed: number;
  originalsRecovered: number;
  originalsManual: number;
  details: RepairStepResult[];
}

async function fetchAllCards(): Promise<CardLite[]> {
  const PAGE = 1000;
  const all: CardLite[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (supabase as any)
      .from("flashcards")
      .select("id,unit_id,order_index,kind,image_url,thumbnail_url,image_width,image_height,image_size_kb,english_translation")
      .order("unit_id").order("order_index")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as CardLite[]));
    if (data.length < PAGE) break;
  }
  return all;
}

async function fetchUnits(): Promise<Map<string, UnitLite>> {
  const { data, error } = await (supabase as any)
    .from("flashcard_units").select("id,slug,title_en");
  if (error) throw error;
  const map = new Map<string, UnitLite>();
  for (const u of data ?? []) map.set(u.id, u as UnitLite);
  return map;
}

async function blobFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return await res.blob();
}

/** Step A — regenerate missing thumbnails + dimensions from existing image_url. */
async function repairMissingThumbnails(
  cards: CardLite[],
  units: Map<string, UnitLite>,
  onProgress?: (done: number, total: number) => void,
): Promise<RepairStepResult[]> {
  const targets = cards.filter(
    (c) => c.image_url && (!c.thumbnail_url || !c.image_width || !c.image_height || c.image_size_kb == null),
  );
  const out: RepairStepResult[] = [];
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    const unit = units.get(c.unit_id);
    const slug = unit?.slug || "unknown";
    try {
      const blob = await blobFromUrl(c.image_url!);
      const compressed = await compressFlashcardImage(blob);
      const base = `repaired-${c.id}`;
      const origPath = `flashcards/images/${slug}/${base}.webp`;
      const thumbPath = `flashcards/thumbnails/${slug}/${base}.webp`;
      const [{ error: upErr }, { error: thErr }] = await Promise.all([
        supabase.storage.from(BUCKET).upload(origPath, compressed.original.blob, { upsert: true, contentType: "image/webp" }),
        supabase.storage.from(BUCKET).upload(thumbPath, compressed.thumbnail.blob, { upsert: true, contentType: "image/webp" }),
      ]);
      if (upErr) throw upErr;
      if (thErr) throw thErr;
      const image_url = supabase.storage.from(BUCKET).getPublicUrl(origPath).data.publicUrl;
      const thumbnail_url = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
      await writeAndVerify(c.id, {
        image_url,
        thumbnail_url,
        image_width: compressed.original.width,
        image_height: compressed.original.height,
        image_size_kb: compressed.original.sizeKb,
      });
      out.push({ cardId: c.id, unitSlug: slug, order_index: c.order_index, kind: c.kind, status: "repaired" });
    } catch (e: any) {
      out.push({ cardId: c.id, unitSlug: slug, order_index: c.order_index, kind: c.kind, status: "failed", message: e.message });
    }
    onProgress?.(i + 1, targets.length);
  }
  return out;
}

/** Try to find an existing storage file for a card with no image_url. */
async function findStorageMatch(slug: string, order: number): Promise<{ path: string } | null> {
  const prefix = `flashcards/images/${slug}`;
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error || !data) return null;
  // Accept files whose LAST run of digits equals the card's order_index.
  const padded = String(order).padStart(3, "0");
  for (const obj of data) {
    if (obj.name.startsWith(".")) continue;
    const stem = obj.name.replace(/\.[^.]+$/, "");
    const nums = stem.match(/\d+/g);
    if (!nums) continue;
    const last = nums[nums.length - 1];
    if (parseInt(last, 10) === order || last === padded) {
      return { path: `${prefix}/${obj.name}` };
    }
  }
  return null;
}

/** Step B — recover missing originals from storage when filename matches order. */
async function recoverMissingOriginals(
  cards: CardLite[],
  units: Map<string, UnitLite>,
  onProgress?: (done: number, total: number) => void,
): Promise<RepairStepResult[]> {
  const targets = cards.filter((c) => !c.image_url);
  const out: RepairStepResult[] = [];
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    const unit = units.get(c.unit_id);
    const slug = unit?.slug || null;
    if (!slug) {
      out.push({ cardId: c.id, unitSlug: slug, order_index: c.order_index, kind: c.kind, status: "skipped", message: "Unit has no slug" });
      onProgress?.(i + 1, targets.length);
      continue;
    }
    try {
      const found = await findStorageMatch(slug, c.order_index);
      if (!found) {
        out.push({ cardId: c.id, unitSlug: slug, order_index: c.order_index, kind: c.kind, status: "skipped", message: "No matching storage file — manual upload required" });
        onProgress?.(i + 1, targets.length);
        continue;
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(found.path);
      const blob = await blobFromUrl(pub.publicUrl);
      const compressed = await compressFlashcardImage(blob);
      const base = `recovered-${c.id}`;
      const origPath = `flashcards/images/${slug}/${base}.webp`;
      const thumbPath = `flashcards/thumbnails/${slug}/${base}.webp`;
      const [{ error: upErr }, { error: thErr }] = await Promise.all([
        supabase.storage.from(BUCKET).upload(origPath, compressed.original.blob, { upsert: true, contentType: "image/webp" }),
        supabase.storage.from(BUCKET).upload(thumbPath, compressed.thumbnail.blob, { upsert: true, contentType: "image/webp" }),
      ]);
      if (upErr) throw upErr;
      if (thErr) throw thErr;
      const image_url = supabase.storage.from(BUCKET).getPublicUrl(origPath).data.publicUrl;
      const thumbnail_url = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
      await writeAndVerify(c.id, {
        image_url, thumbnail_url,
        image_width: compressed.original.width,
        image_height: compressed.original.height,
        image_size_kb: compressed.original.sizeKb,
      });
      out.push({ cardId: c.id, unitSlug: slug, order_index: c.order_index, kind: c.kind, status: "repaired", message: `Recovered from ${found.path}` });
    } catch (e: any) {
      out.push({ cardId: c.id, unitSlug: slug, order_index: c.order_index, kind: c.kind, status: "failed", message: e.message });
    }
    onProgress?.(i + 1, targets.length);
  }
  return out;
}

export async function runRepair(
  onProgress?: (phase: "thumbnails" | "originals", done: number, total: number) => void,
): Promise<RepairSummary> {
  const [cards, units] = await Promise.all([fetchAllCards(), fetchUnits()]);
  const thumbResults = await repairMissingThumbnails(cards, units, (d, t) => onProgress?.("thumbnails", d, t));
  // Re-fetch in case thumbnail step changed things.
  const cards2 = await fetchAllCards();
  const origResults = await recoverMissingOriginals(cards2, units, (d, t) => onProgress?.("originals", d, t));
  return {
    thumbnailsRepaired: thumbResults.filter((r) => r.status === "repaired").length,
    thumbnailsFailed: thumbResults.filter((r) => r.status === "failed").length,
    originalsRecovered: origResults.filter((r) => r.status === "repaired").length,
    originalsManual: origResults.filter((r) => r.status === "skipped").length,
    details: [...thumbResults, ...origResults],
  };
}

export interface IntegrityReport {
  total: number;
  healthy: number;
  missingOriginals: number;
  missingThumbnails: number;
  missingMetadata: number;
  brokenOriginalUrls: number;
  brokenThumbnailUrls: number;
  perUnit: Array<{
    unitId: string;
    slug: string | null;
    title: string | null;
    total: number;
    healthy: number;
    missingOriginals: number;
    missingThumbnails: number;
    missingMetadata: number;
  }>;
  problems: Array<{
    cardId: string;
    unitSlug: string | null;
    order_index: number;
    kind: string;
    english: string | null;
    issue: string;
  }>;
}

async function urlOk(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

/** Full integrity scan. Optionally verifies storage URLs via HEAD requests. */
export async function runIntegrityScan(opts: { verifyUrls?: boolean } = {}): Promise<IntegrityReport> {
  const [cards, units] = await Promise.all([fetchAllCards(), fetchUnits()]);
  const perUnit = new Map<string, IntegrityReport["perUnit"][number]>();
  const problems: IntegrityReport["problems"] = [];

  let healthy = 0, missingOriginals = 0, missingThumbnails = 0, missingMetadata = 0;
  let brokenOriginalUrls = 0, brokenThumbnailUrls = 0;

  for (const c of cards) {
    const unit = units.get(c.unit_id);
    const slug = unit?.slug ?? null;
    if (!perUnit.has(c.unit_id)) {
      perUnit.set(c.unit_id, {
        unitId: c.unit_id, slug, title: unit?.title_en ?? null,
        total: 0, healthy: 0, missingOriginals: 0, missingThumbnails: 0, missingMetadata: 0,
      });
    }
    const u = perUnit.get(c.unit_id)!;
    u.total++;

    const issues: string[] = [];
    if (!c.image_url) { issues.push("missing image_url"); u.missingOriginals++; missingOriginals++; }
    if (!c.thumbnail_url) { issues.push("missing thumbnail_url"); u.missingThumbnails++; missingThumbnails++; }
    if (!c.image_width || !c.image_height || c.image_size_kb == null) {
      issues.push("missing dimensions/size"); u.missingMetadata++; missingMetadata++;
    }

    if (issues.length === 0) {
      u.healthy++; healthy++;
    } else {
      problems.push({
        cardId: c.id, unitSlug: slug, order_index: c.order_index, kind: c.kind,
        english: c.english_translation, issue: issues.join("; "),
      });
    }
  }

  if (opts.verifyUrls) {
    // Limited concurrency HEAD checks — only for cards we believe healthy.
    const toCheck = cards.filter((c) => c.image_url && c.thumbnail_url);
    const concurrency = 8;
    let cursor = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < toCheck.length) {
        const c = toCheck[cursor++];
        const [origOk, thumbOk] = await Promise.all([
          urlOk(c.image_url!), urlOk(c.thumbnail_url!),
        ]);
        if (!origOk) {
          brokenOriginalUrls++;
          problems.push({ cardId: c.id, unitSlug: units.get(c.unit_id)?.slug ?? null, order_index: c.order_index, kind: c.kind, english: c.english_translation, issue: "original URL 404" });
        }
        if (!thumbOk) {
          brokenThumbnailUrls++;
          problems.push({ cardId: c.id, unitSlug: units.get(c.unit_id)?.slug ?? null, order_index: c.order_index, kind: c.kind, english: c.english_translation, issue: "thumbnail URL 404" });
        }
      }
    });
    await Promise.all(workers);
  }

  return {
    total: cards.length,
    healthy,
    missingOriginals,
    missingThumbnails,
    missingMetadata,
    brokenOriginalUrls,
    brokenThumbnailUrls,
    perUnit: Array.from(perUnit.values()).sort((a, b) => (a.slug ?? "").localeCompare(b.slug ?? "")),
    problems,
  };
}
