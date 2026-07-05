/**
 * CSV helpers for the flashcard admin tools.
 *
 * Pure browser code — no Node-only APIs.
 */

export const CARD_CSV_COLUMNS = [
  "id",
  "unit_id",
  "kind",
  "arabic_text",
  "english_translation",
  "transliteration",
  "notes",
  "image_url",
  "audio_url",
  "published",
  "order_index",
] as const;

export type CardCsvColumn = (typeof CARD_CSV_COLUMNS)[number];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: readonly string[] = CARD_CSV_COLUMNS,
): string {
  const header = columns.join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCell((r as any)[c])).join(","))
    .join("\n");
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.length > 1 || cur[0] !== "") rows.push(cur);
        cur = [];
      } else field += ch;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const headers = rows.shift()!.map((h) => h.trim());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? "").trim()])));
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, csv: string) {
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
}

export function normalizeArabic(s: string | null | undefined): string {
  return (s ?? "").trim();
}

export function parseBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === 1;
}

export async function chunked<T>(
  items: T[],
  size: number,
  fn: (chunk: T[], index: number) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size), Math.floor(i / size));
  }
}
