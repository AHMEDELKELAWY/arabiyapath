/**
 * One-off migration: normalize the Verbs unit to the frozen image standard.
 *
 *   content/flashcards/images/verbs/verbs-NNN.webp
 *   content/flashcards/thumbnails/verbs/verbs-NNN-thumb.webp
 *
 * For each order_index in Verbs:
 *   1. Pick a source image_url (prefer Learn, fall back to Speaking).
 *   2. Download it, detect MIME, compress to WEBP via the shared pipeline.
 *   3. Upload to the canonical paths (overwrite).
 *   4. Update BOTH Learn and Speaking rows at that order_index with the same
 *      image_url, thumbnail_url, image_width, image_height, image_size_kb.
 *
 * Card IDs, order_index, kinds, and learner content are NEVER changed —
 * only image assets are normalized.
 */

import { supabase } from "@/integrations/supabase/client";
import { compressFlashcardImage } from "./imageCompress";
import { writeAndVerify, cardImageBaseName } from "./imageWrite";

const BUCKET = "content";
const VERBS_SLUG = "verbs";

export interface VerbsMigrationItem {
  order_index: number;
  status: "migrated" | "skipped" | "failed";
  sourceUrl?: string;
  sourceExt?: string; // jpg | png | webp | unknown
  cardsUpdated?: number;
  message?: string;
}

export interface VerbsMigrationReport {
  unitId: string;
  totalOrderIndices: number;
  migrated: number;
  convertedFromJpg: number;
  convertedFromPng: number;
  alreadyWebp: number;
  failed: number;
  cardsTouched: number;
  items: VerbsMigrationItem[];
  storageTree: { images: string[]; thumbnails: string[] };
}

function extOf(url: string): string {
  const m = url.toLowerCase().match(/\.(jpe?g|png|webp)(?:\?|#|$)/);
  if (!m) return "unknown";
  if (m[1].startsWith("jp")) return "jpg";
  return m[1];
}

async function blobFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return await res.blob();
}

async function listStorageTree(): Promise<{ images: string[]; thumbnails: string[] }> {
  const [{ data: imgs }, { data: thumbs }] = await Promise.all([
    supabase.storage.from(BUCKET).list(`flashcards/images/${VERBS_SLUG}`, { limit: 1000, sortBy: { column: "name", order: "asc" } }),
    supabase.storage.from(BUCKET).list(`flashcards/thumbnails/${VERBS_SLUG}`, { limit: 1000, sortBy: { column: "name", order: "asc" } }),
  ]);
  return {
    images: (imgs ?? []).map((o) => o.name).filter((n) => !n.startsWith(".")),
    thumbnails: (thumbs ?? []).map((o) => o.name).filter((n) => !n.startsWith(".")),
  };
}

export async function migrateVerbsUnit(
  onProgress?: (done: number, total: number, current: number) => void,
): Promise<VerbsMigrationReport> {
  // 1. Find Verbs unit.
  const { data: unit, error: unitErr } = await (supabase as any)
    .from("flashcard_units").select("id,slug").eq("slug", VERBS_SLUG).single();
  if (unitErr || !unit) throw new Error("Verbs unit not found");

  // 2. Fetch all cards.
  const { data: cards, error: cardsErr } = await (supabase as any)
    .from("flashcards")
    .select("id, order_index, kind, image_url, image_alt, english_translation")
    .eq("unit_id", unit.id)
    .order("order_index");
  if (cardsErr) throw cardsErr;

  // 3. Group by order_index.
  const byOrder = new Map<number, any[]>();
  for (const c of cards ?? []) {
    if (!byOrder.has(c.order_index)) byOrder.set(c.order_index, []);
    byOrder.get(c.order_index)!.push(c);
  }
  const orders = Array.from(byOrder.keys()).sort((a, b) => a - b);

  const report: VerbsMigrationReport = {
    unitId: unit.id,
    totalOrderIndices: orders.length,
    migrated: 0,
    convertedFromJpg: 0,
    convertedFromPng: 0,
    alreadyWebp: 0,
    failed: 0,
    cardsTouched: 0,
    items: [],
    storageTree: { images: [], thumbnails: [] },
  };

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const group = byOrder.get(order)!;
    onProgress?.(i, orders.length, order);

    // Pick source: prefer Learn, then Speaking, with a non-null image_url.
    const learn = group.find((c) => c.kind === "learn" && c.image_url);
    const speaking = group.find((c) => c.kind === "speaking" && c.image_url);
    const source = learn ?? speaking;
    if (!source) {
      report.items.push({ order_index: order, status: "skipped", message: "No source image for any card at this order" });
      continue;
    }
    const sourceUrl = source.image_url as string;
    const sourceExt = extOf(sourceUrl);

    try {
      const blob = await blobFromUrl(sourceUrl);
      const compressed = await compressFlashcardImage(blob);
      const base = cardImageBaseName(VERBS_SLUG, order);
      const origPath = `flashcards/images/${VERBS_SLUG}/${base}.webp`;
      const thumbPath = `flashcards/thumbnails/${VERBS_SLUG}/${base}-thumb.webp`;
      const [{ error: upErr }, { error: thErr }] = await Promise.all([
        supabase.storage.from(BUCKET).upload(origPath, compressed.original.blob, { upsert: true, contentType: "image/webp" }),
        supabase.storage.from(BUCKET).upload(thumbPath, compressed.thumbnail.blob, { upsert: true, contentType: "image/webp" }),
      ]);
      if (upErr) throw upErr;
      if (thErr) throw thErr;
      const image_url = supabase.storage.from(BUCKET).getPublicUrl(origPath).data.publicUrl;
      const thumbnail_url = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

      let cardsUpdated = 0;
      for (const c of group) {
        await writeAndVerify(c.id, {
          image_url,
          thumbnail_url,
          image_width: compressed.original.width,
          image_height: compressed.original.height,
          image_size_kb: compressed.original.sizeKb,
          image_alt: c.image_alt || c.english_translation,
        });
        cardsUpdated++;
      }
      report.cardsTouched += cardsUpdated;
      report.migrated++;
      if (sourceExt === "jpg") report.convertedFromJpg++;
      else if (sourceExt === "png") report.convertedFromPng++;
      else if (sourceExt === "webp") report.alreadyWebp++;
      report.items.push({ order_index: order, status: "migrated", sourceUrl, sourceExt, cardsUpdated });
    } catch (e: any) {
      report.failed++;
      report.items.push({ order_index: order, status: "failed", sourceUrl, sourceExt, message: e.message });
    }
  }
  onProgress?.(orders.length, orders.length, -1);

  report.storageTree = await listStorageTree();
  return report;
}
