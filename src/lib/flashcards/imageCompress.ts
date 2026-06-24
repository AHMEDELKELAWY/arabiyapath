/**
 * Client-side image compression for flashcards.
 * Produces a WEBP "original" (≤1200x900, ≤200KB target) and a
 * WEBP "thumbnail" (300x225, ≤50KB target) plus dimensions.
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
    // Revoke after load so HTMLImageElement keeps its bitmap.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function fitInside(srcW: number, srcH: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
  return { w: Math.max(1, Math.round(srcW * ratio)), h: Math.max(1, Math.round(srcH * ratio)) };
}

function fitCover(srcW: number, srcH: number, targetW: number, targetH: number) {
  const ratio = Math.max(targetW / srcW, targetH / srcH);
  const w = srcW * ratio;
  const h = srcH * ratio;
  const sx = (w - targetW) / 2 / ratio;
  const sy = (h - targetH) / 2 / ratio;
  const sw = targetW / ratio;
  const sh = targetH / ratio;
  return { sx, sy, sw, sh };
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

async function encodeIterative(
  canvas: HTMLCanvasElement,
  targetBytes: number,
  startQuality = 0.85,
): Promise<Blob> {
  let quality = startQuality;
  let blob = await canvasToWebp(canvas, quality);
  // Iteratively lower quality until under target or quality floor reached.
  while (blob.size > targetBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToWebp(canvas, quality);
  }
  return blob;
}

export async function compressFlashcardImage(file: Blob): Promise<CompressionResult> {
  const img = await loadImage(file);

  // ---- Original: fit inside 1200x900, ≤200KB ----
  const fit = fitInside(img.naturalWidth, img.naturalHeight, 1200, 900);
  const origCanvas = document.createElement("canvas");
  origCanvas.width = fit.w;
  origCanvas.height = fit.h;
  const octx = origCanvas.getContext("2d")!;
  octx.drawImage(img, 0, 0, fit.w, fit.h);
  const originalBlob = await encodeIterative(origCanvas, 200 * 1024, 0.85);

  // ---- Thumbnail: cropped cover to 300x225, ≤50KB ----
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = 300;
  thumbCanvas.height = 225;
  const tctx = thumbCanvas.getContext("2d")!;
  const c = fitCover(img.naturalWidth, img.naturalHeight, 300, 225);
  tctx.drawImage(img, c.sx, c.sy, c.sw, c.sh, 0, 0, 300, 225);
  const thumbBlob = await encodeIterative(thumbCanvas, 50 * 1024, 0.8);

  return {
    original: {
      blob: originalBlob,
      width: fit.w,
      height: fit.h,
      sizeKb: Math.round(originalBlob.size / 1024),
    },
    thumbnail: {
      blob: thumbBlob,
      width: 300,
      height: 225,
      sizeKb: Math.round(thumbBlob.size / 1024),
    },
  };
}
