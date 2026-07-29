/**
 * CSV import/export for lessons (bulk create + update).
 *
 * Columns (header row required, order-independent):
 *   id, unit_id, title, order_index, arabic_text, transliteration,
 *   image_url, audio_url, image_prompt, image_style, voice_id
 *
 * Matching rule:
 *   - `id` present  → update that lesson
 *   - otherwise     → match on (unit_id + order_index); insert if no match
 */

import { DEFAULT_MEDIA_SETTINGS, IMAGE_STYLES } from "./lessonMediaSettings";

export const LESSON_CSV_COLUMNS = [
  "id",
  "unit_id",
  "title",
  "order_index",
  "arabic_text",
  "transliteration",
  "image_url",
  "audio_url",
  "image_prompt",
  "image_style",
  "voice_id",
] as const;

export interface LessonCsvRow {
  id?: string;
  unit_id?: string;
  title?: string;
  order_index?: number;
  arabic_text?: string;
  transliteration?: string;
  image_url?: string;
  audio_url?: string;
  image_prompt?: string;
  image_style?: string;
  voice_id?: string;
}

/** RFC4180-ish CSV parser (handles quotes, embedded commas and newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface ParsedCsv {
  rows: LessonCsvRow[];
  errors: string[];
}

export function parseLessonsCsv(text: string): ParsedCsv {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length < 2) {
    return { rows: [], errors: ["The CSV file needs a header row and at least one data row."] };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const unknown = header.filter((h) => h && !(LESSON_CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) errors.push(`Ignored unknown columns: ${unknown.join(", ")}`);
  if (!header.includes("title")) errors.push("Missing required column: title");

  const styleValues = IMAGE_STYLES.map((s) => s.value) as readonly string[];
  const rows: LessonCsvRow[] = [];

  table.slice(1).forEach((cells, idx) => {
    const rowNo = idx + 2;
    const get = (key: string) => {
      const at = header.indexOf(key);
      return at === -1 ? "" : (cells[at] ?? "").trim();
    };

    const title = get("title");
    if (!title) {
      errors.push(`Row ${rowNo}: title is required — row skipped.`);
      return;
    }

    const orderRaw = get("order_index");
    const order = orderRaw === "" ? undefined : Number(orderRaw);
    if (order !== undefined && !Number.isFinite(order)) {
      errors.push(`Row ${rowNo}: order_index "${orderRaw}" is not a number — treated as empty.`);
    }

    const style = get("image_style");
    if (style && !styleValues.includes(style)) {
      errors.push(`Row ${rowNo}: unknown image_style "${style}" — using default.`);
    }

    rows.push({
      id: get("id") || undefined,
      unit_id: get("unit_id") || undefined,
      title,
      order_index: Number.isFinite(order) ? (order as number) : undefined,
      arabic_text: get("arabic_text") || undefined,
      transliteration: get("transliteration") || undefined,
      image_url: get("image_url") || undefined,
      audio_url: get("audio_url") || undefined,
      image_prompt: get("image_prompt") || undefined,
      image_style: style && styleValues.includes(style) ? style : undefined,
      voice_id: get("voice_id") || undefined,
    });
  });

  return { rows, errors };
}

/** Merge CSV media fields into an existing settings object. */
export function mergeCsvMediaSettings(existing: unknown, row: LessonCsvRow) {
  const base = { ...DEFAULT_MEDIA_SETTINGS, ...(existing && typeof existing === "object" ? existing : {}) };
  return {
    ...base,
    ...(row.image_prompt !== undefined ? { image_prompt: row.image_prompt } : {}),
    ...(row.image_style !== undefined ? { image_style: row.image_style } : {}),
    ...(row.voice_id !== undefined ? { voice_id: row.voice_id } : {}),
  };
}

function escapeCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function lessonsToCsv(lessons: any[]): string {
  const header = LESSON_CSV_COLUMNS.join(",");
  const lines = lessons.map((l) => {
    const ms = (l.media_settings ?? {}) as Record<string, unknown>;
    return [
      l.id,
      l.unit_id,
      l.title,
      l.order_index,
      l.arabic_text ?? "",
      l.transliteration ?? "",
      l.image_url ?? "",
      l.audio_url ?? "",
      ms.image_prompt ?? "",
      ms.image_style ?? "",
      ms.voice_id ?? "",
    ]
      .map(escapeCell)
      .join(",");
  });
  return [header, ...lines].join("\n");
}

export const LESSON_CSV_TEMPLATE = `${LESSON_CSV_COLUMNS.join(",")}
,,"Hello & Goodbye",1,"مَرْحَبًا","marhaban",,,"Two friends greeting each other in a Gulf café",flat,
`;
