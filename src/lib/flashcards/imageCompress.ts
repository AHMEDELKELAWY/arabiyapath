/**
 * Client-side image compression for flashcards.
 *
 * FROZEN STANDARD:
 *   - Format: WEBP only
 *   - Original quality: 0.82 (fixed)
 *   - Original max width: 1024px (aspect ratio preserved; no upscale)
 *   - Thumbnail width: 300px (aspect ratio preserved)
 *   - Thumbnail quality: 0.82
 */

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  sizeKb: number;
}

export interface CompressionResult {
  original: CompressedImage;
  thumbnail: CompressedImage;
}

const ORIGINAL_QUALITY = 0.82;
const ORIGINAL_MAX_WIDTH = 1024;
const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_QUALITY = 0.82;

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas encode failed"))),
      "image/webp",
      quality,
    );
  });
}

export async function compressFlashcardImage(file: Blob): Promise<CompressionResult> {
  const img = await loadImage(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // ---- Original: cap width at 1024, preserve aspect ratio, no upscale ----
  const origScale = Math.min(1, ORIGINAL_MAX_WIDTH / srcW);
  const origW = Math.max(1, Math.round(srcW * origScale));
  const origH = Math.max(1, Math.round(srcH * origScale));
  const origCanvas = document.createElement("canvas");
  origCanvas.width = origW;
  origCanvas.height = origH;
  const octx = origCanvas.getContext("2d")!;
  octx.drawImage(img, 0, 0, origW, origH);
  const originalBlob = await canvasToWebp(origCanvas, ORIGINAL_QUALITY);

  // ---- Thumbnail: width 300, preserve aspect ratio, no upscale ----
  const thumbScale = Math.min(1, THUMBNAIL_WIDTH / srcW);
  const thumbW = Math.max(1, Math.round(srcW * thumbScale));
  const thumbH = Math.max(1, Math.round(srcH * thumbScale));
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const tctx = thumbCanvas.getContext("2d")!;
  tctx.drawImage(img, 0, 0, thumbW, thumbH);
  const thumbBlob = await canvasToWebp(thumbCanvas, THUMBNAIL_QUALITY);

  return {
    original: {
      blob: originalBlob,
      width: origW,
      height: origH,
      sizeKb: Math.round(originalBlob.size / 1024),
    },
    thumbnail: {
      blob: thumbBlob,
      width: thumbW,
      height: thumbH,
      sizeKb: Math.round(thumbBlob.size / 1024),
    },
  };
}
