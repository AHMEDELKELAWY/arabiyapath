// Helpers to classify flashcards as vocabulary (single word) vs sentence,
// without touching the database schema.

export const stripTashkeel = (s: string) =>
  (s ?? "").replace(/[\u064B-\u065F\u0670]/g, "");

export const isWord = (s: string) =>
  stripTashkeel(s).trim().split(/\s+/).filter(Boolean).length === 1;

export interface ClassifiableCard {
  arabic_text: string;
  example_arabic: string | null;
}

export const isVocab = (c: ClassifiableCard) =>
  !c.example_arabic && isWord(c.arabic_text);

export const isSentence = (c: ClassifiableCard) => !isVocab(c);

export function splitCards<T extends ClassifiableCard>(cards: T[]) {
  return {
    vocab: cards.filter(isVocab),
    sentences: cards.filter(isSentence),
  };
}

export function sentenceText(c: ClassifiableCard): string {
  return (c.example_arabic && c.example_arabic.trim()) || c.arabic_text;
}

export function sentenceAudio(c: {
  audio_url: string | null;
  audio_example_url: string | null;
}): string | null {
  return c.audio_example_url || c.audio_url || null;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
