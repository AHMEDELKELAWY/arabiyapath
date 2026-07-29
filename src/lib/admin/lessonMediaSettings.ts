/**
 * Per-lesson AI media generation settings.
 * Stored on `lessons.media_settings` (jsonb) so the chosen options are
 * remembered for each lesson and reused on regeneration.
 */

export const IMAGE_STYLES = [
  { value: "flat", label: "Flat illustration", prompt: "flat design illustration, modern, minimalist, clean shapes" },
  { value: "photo", label: "Realistic photo", prompt: "realistic photograph, natural lighting, documentary style, high detail" },
  { value: "watercolor", label: "Watercolor", prompt: "soft watercolor painting, gentle brush strokes, warm paper texture" },
  { value: "cartoon", label: "Friendly cartoon", prompt: "friendly cartoon illustration, bold outlines, cheerful colors" },
  { value: "line", label: "Line art", prompt: "clean line art, monoline strokes, limited color accents" },
  { value: "3d", label: "3D render", prompt: "soft 3D render, clay-like materials, studio lighting" },
] as const;

export type ImageStyle = (typeof IMAGE_STYLES)[number]["value"];

export const VOICES = [
  { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (default)" },
  { value: "JBFqnCBsd6RMkjVDRZzb", label: "George" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
  { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel" },
  { value: "XrExE9yKIg1WjnnlVkGX", label: "Matilda" },
  { value: "iP95p4xoKVk53GoZ742B", label: "Chris" },
] as const;

export interface LessonMediaSettings {
  /** Image */
  image_style: ImageStyle;
  /** 1 (draft) → 5 (maximum detail) */
  image_quality: number;
  image_prompt: string;
  /** Audio */
  voice_id: string;
  /** 0.7 – 1.2 */
  speed: number;
  /** 0 – 1 */
  stability: number;
  /** Max characters sent to TTS (controls clip length) */
  max_chars: number;
}

export const DEFAULT_MEDIA_SETTINGS: LessonMediaSettings = {
  image_style: "flat",
  image_quality: 3,
  image_prompt: "",
  voice_id: "21m00Tcm4TlvDq8ikWAM",
  speed: 0.9,
  stability: 0.6,
  max_chars: 300,
};

export function parseMediaSettings(raw: unknown): LessonMediaSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<LessonMediaSettings>;
  return {
    ...DEFAULT_MEDIA_SETTINGS,
    ...value,
    image_quality: clamp(Number(value.image_quality ?? DEFAULT_MEDIA_SETTINGS.image_quality), 1, 5),
    speed: clamp(Number(value.speed ?? DEFAULT_MEDIA_SETTINGS.speed), 0.7, 1.2),
    stability: clamp(Number(value.stability ?? DEFAULT_MEDIA_SETTINGS.stability), 0, 1),
    max_chars: clamp(Number(value.max_chars ?? DEFAULT_MEDIA_SETTINGS.max_chars), 50, 1000),
  };
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

const QUALITY_HINTS: Record<number, string> = {
  1: "simple rough sketch, low detail",
  2: "clean but simple, modest detail",
  3: "well-composed, balanced detail",
  4: "highly detailed, polished, professional composition",
  5: "extremely detailed, award-winning quality, rich textures and lighting",
};

/** Build the final image prompt from the lesson content + saved settings. */
export function buildImagePrompt(
  lessonTitle: string,
  settings: LessonMediaSettings,
): string {
  const style = IMAGE_STYLES.find((s) => s.value === settings.image_style) ?? IMAGE_STYLES[0];
  const base =
    settings.image_prompt.trim() ||
    `An educational illustration for an Arabic language lesson about: "${lessonTitle}". Culturally appropriate for a Middle Eastern context, warm and inviting, clearly representing the concept.`;
  return `${base} Style: ${style.prompt}. Quality: ${QUALITY_HINTS[settings.image_quality] ?? QUALITY_HINTS[3]}. Do not include any text or lettering in the image.`;
}
