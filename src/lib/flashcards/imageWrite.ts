/**
 * Single source of truth for writing flashcard image data.
 *
 * Every upload path (Bulk Upload, Replace Image, AI Generate, Repair tool)
 * MUST go through writeCardImage() so the DB stays consistent.
 *
 * Rules:
 *  - image_url is the canonical image (business logic source of truth).
 *  - thumbnail_url is required and only an optimization for previews.
 *  - image_width, image_height, image_size_kb MUST be populated.
 *  - After UPDATE the row is re-fetched and verified; partial writes throw.
 */

import { supabase } from "@/integrations/supabase/client";
import { compressFlashcardImage, type CompressionResult } from "./imageCompress";

const BUCKET = "content";

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
  /** Filename stem used to build storage paths (no extension). */
  baseName: string;
  /** Source file/blob — will be compressed client-side. */
  source: Blob;
  /** Optional alt text override. */
  imageAlt?: string | null;
}

export interface UploadResult extends CardImageFields {
  origPath: string;
  thumbPath: string;
}

/**
 * Upload an image + thumbnail to Storage, write all image fields on the
 * flashcard row, then re-fetch and verify. Throws on any partial state.
 */
export async function uploadAndWriteCardImage(
  inputs: UploadInputs,
): Promise<UploadResult> {
  const { cardId, unitSlug, baseName, source, imageAlt } = inputs;
  if (!unitSlug) throw new Error("Unit slug required to build storage path");
  if (!baseName) throw new Error("baseName required");

  const compressed: CompressionResult = await compressFlashcardImage(source);

  const safeBase = baseName.replace(/\.[^.]+$/, "");
  const origPath = `flashcards/images/${unitSlug}/${safeBase}.webp`;
  const thumbPath = `flashcards/thumbnails/${unitSlug}/${safeBase}.webp`;

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
