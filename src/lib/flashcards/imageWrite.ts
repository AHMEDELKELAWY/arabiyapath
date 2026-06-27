/**
 * Single source of truth for writing flashcard image data.
 *
 * Every upload path (Bulk Upload, Replace Image, AI Generate, Repair tool,
 * Migration) MUST go through uploadAndWriteCardImage() so the DB stays
 * consistent.
 *
 * FROZEN STORAGE STRUCTURE — per-kind identity:
 *   content/flashcards/images/<unit-slug>/<kind>/<unit-slug>-NNN.webp
 *   content/flashcards/thumbnails/<unit-slug>/<kind>/<unit-slug>-NNN-thumb.webp
 *
 * Canonical identity = (unit_slug + kind + order_index).
 *
 * Learn and Speaking cards NEVER share the same image file. Listening and
 * Test consume both — but they read each row's own image_url independently.
 *
 * Filenames are derived from unit slug + 1-based, zero-padded order_index.
 * UUIDs are NEVER used as filenames for new images.
 */

import { supabase } from "@/integrations/supabase/client";
import { compressFlashcardImage, type CompressionResult } from "./imageCompress";

const BUCKET = "content";

export type CardKind = "learn" | "speaking";

export interface CardImageFields {
  image_url: string;
  thumbnail_url: string;
  image_width: number;
  image_height: number;
  image_size_kb: number;
  image_alt?: string | null;
}

export interface UploadInputs {
  cardId: string;
  unitSlug: string;
  /** Card kind — required. Determines the storage sub-folder. */
  kind: CardKind;
  /** Card's 1-based order_index. Used to build the canonical filename. */
  orderIndex: number;
  /** Source file/blob — will be compressed client-side. */
  source: Blob;
  /** Optional alt text override. */
  imageAlt?: string | null;
}

export interface UploadResult extends CardImageFields {
  origPath: string;
  thumbPath: string;
}

/** Canonical base name for a card image: `<slug>-NNN`. */
export function cardImageBaseName(unitSlug: string, orderIndex: number): string {
  const padded = String(orderIndex).padStart(3, "0");
  return `${unitSlug}-${padded}`;
}

/** Canonical storage paths for a card (per-kind). */
export function cardImagePaths(
  unitSlug: string,
  kind: CardKind,
  orderIndex: number,
): { origPath: string; thumbPath: string } {
  const base = cardImageBaseName(unitSlug, orderIndex);
  return {
    origPath: `flashcards/images/${unitSlug}/${kind}/${base}.webp`,
    thumbPath: `flashcards/thumbnails/${unitSlug}/${kind}/${base}-thumb.webp`,
  };
}

/**
 * Upload image + thumbnail using the per-kind frozen naming, write all image
 * fields on the flashcard row, then re-fetch and verify. Throws on partial state.
 */
export async function uploadAndWriteCardImage(
  inputs: UploadInputs,
): Promise<UploadResult> {
  const { cardId, unitSlug, kind, orderIndex, source, imageAlt } = inputs;
  if (!unitSlug) throw new Error("Unit slug required to build storage path");
  if (kind !== "learn" && kind !== "speaking") {
    throw new Error(`kind must be 'learn' or 'speaking' (got: ${String(kind)})`);
  }
  if (!Number.isFinite(orderIndex)) throw new Error("orderIndex required");

  const compressed: CompressionResult = await compressFlashcardImage(source);
  const { origPath, thumbPath } = cardImagePaths(unitSlug, kind, orderIndex);

  const [{ error: upErr }, { error: thErr }] = await Promise.all([
    supabase.storage.from(BUCKET).upload(origPath, compressed.original.blob, {
      upsert: true, contentType: "image/webp",
    }),
    supabase.storage.from(BUCKET).upload(thumbPath, compressed.thumbnail.blob, {
      upsert: true, contentType: "image/webp",
    }),
  ]);
  if (upErr) throw upErr;
  if (thErr) throw thErr;

  const image_url = supabase.storage.from(BUCKET).getPublicUrl(origPath).data.publicUrl;
  const thumbnail_url = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

  const fields: CardImageFields = {
    image_url,
    thumbnail_url,
    image_width: compressed.original.width,
    image_height: compressed.original.height,
    image_size_kb: compressed.original.sizeKb,
    ...(imageAlt !== undefined ? { image_alt: imageAlt } : {}),
  };

  await writeAndVerify(cardId, fields);

  return { ...fields, origPath, thumbPath };
}

/**
 * Write the given image fields and re-fetch to confirm the row is consistent.
 * Throws if any required image field is missing afterward.
 */
export async function writeAndVerify(
  cardId: string,
  fields: CardImageFields,
): Promise<void> {
  const { error: updErr } = await (supabase as any)
    .from("flashcards").update(fields).eq("id", cardId);
  if (updErr) throw updErr;

  const { data: row, error: selErr } = await (supabase as any)
    .from("flashcards")
    .select("image_url,thumbnail_url,image_width,image_height,image_size_kb")
    .eq("id", cardId)
    .single();
  if (selErr) throw selErr;

  const missing: string[] = [];
  if (!row?.image_url) missing.push("image_url");
  if (!row?.thumbnail_url) missing.push("thumbnail_url");
  if (!row?.image_width) missing.push("image_width");
  if (!row?.image_height) missing.push("image_height");
  if (row?.image_size_kb == null) missing.push("image_size_kb");
  if (missing.length) {
    throw new Error(`Upload verification failed — missing: ${missing.join(", ")}`);
  }
}
