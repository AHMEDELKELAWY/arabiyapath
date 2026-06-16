export type MatchStrategy = "order" | "image_key";

export interface MatcherCard {
  id: string;
  order_index: number;
  arabic_text: string;
  english_translation: string;
  image_url?: string | null;
  image_key?: string | null;
}

export interface MatcherFile {
  name: string; // original filename, e.g. "msa-u01-001.jpg"
  size: number;
  blob: Blob;
}

export interface Match {
  card: MatcherCard;
  file: MatcherFile;
  overwrites: boolean;
}

export interface MatchResult {
  matches: Match[];
  unmatchedFiles: MatcherFile[];
  missingCards: MatcherCard[];
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export function isImageFilename(name: string): boolean {
  return IMAGE_EXT.test(name);
}

/** Extract the LAST run of digits from the filename stem. */
export function extractOrderFromFilename(name: string): number | null {
  const base = name.split("/").pop()!.replace(IMAGE_EXT, "");
  const matches = base.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const n = parseInt(last, 10);
  return Number.isFinite(n) ? n : null;
}

export function matchFilesToCards(
  files: MatcherFile[],
  cards: MatcherCard[],
  strategy: MatchStrategy = "order",
): MatchResult {
  const matches: Match[] = [];
  const unmatchedFiles: MatcherFile[] = [];
  const usedCardIds = new Set<string>();

  if (strategy === "image_key") {
    const byKey = new Map<string, MatcherCard>();
    cards.forEach((c) => {
      if (c.image_key) byKey.set(c.image_key.toLowerCase(), c);
    });
    for (const f of files) {
      const stem = f.name.split("/").pop()!.replace(IMAGE_EXT, "").toLowerCase();
      const card = byKey.get(stem);
      if (card && !usedCardIds.has(card.id)) {
        usedCardIds.add(card.id);
        matches.push({ card, file: f, overwrites: !!card.image_url });
      } else {
        unmatchedFiles.push(f);
      }
    }
  } else {
    const byOrder = new Map<number, MatcherCard>();
    cards.forEach((c) => byOrder.set(c.order_index, c));
    for (const f of files) {
      const n = extractOrderFromFilename(f.name);
      if (n == null) {
        unmatchedFiles.push(f);
        continue;
      }
      const card = byOrder.get(n);
      if (card && !usedCardIds.has(card.id)) {
        usedCardIds.add(card.id);
        matches.push({ card, file: f, overwrites: !!card.image_url });
      } else {
        unmatchedFiles.push(f);
      }
    }
  }

  const missingCards = cards.filter((c) => !usedCardIds.has(c.id) && !c.image_url);
  return { matches, unmatchedFiles, missingCards };
}
