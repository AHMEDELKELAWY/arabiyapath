/**
 * Shared assessment generation rules — single source of truth for BOTH
 * `generate-intermediate-test` (full pool) and
 * `regenerate-intermediate-question` (single question).
 *
 * Philosophy: the AI is not an author. It only transforms lesson content the
 * admin already wrote into short, teacher-style questions.
 *
 * Contains: lesson-source contract, wording rules, allowed question types,
 * grounding rules, and validation helpers.
 */

export const AI_VERSION = "int-test/v8-word-order-simple-grammar";

/** Native question types the runner supports. Do NOT extend without runner work. */
export const ALLOWED_TYPES = [
  "multiple_choice",
  "grammar_selection",
  "conversation_completion",
  "vocab_in_context",
  "word_ordering",
  "matching",
  "image_question",
  "choose_correct_sentence",
] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];

/** Types whose `options` array must contain exactly 3 entries. */
export const MC_OPTION_TYPES = new Set<string>([
  "multiple_choice",
  "grammar_selection",
  "conversation_completion",
  "vocab_in_context",
  "choose_correct_sentence",
  "image_question",
]);


/** DB-level categories (flashcard_unit_tests.category CHECK). */
export type Category = "listening" | "vocabulary" | "grammar";

/** Internal lesson sources. `speaking` is stored under the vocabulary category. */
export type LessonSource = "listening" | "learn" | "grammar" | "speaking";

export const SOURCE_TO_CATEGORY: Record<LessonSource, Category> = {
  listening: "listening",
  learn: "vocabulary",
  grammar: "grammar",
  speaking: "vocabulary",
};

export const SOURCE_LABEL: Record<LessonSource, string> = {
  listening: "Listening Transcript",
  learn: "Learn Card",
  grammar: "Grammar Card",
  speaking: "Speaking Card",
};

export function isAllowedType(v: unknown): boolean {
  return (ALLOWED_TYPES as readonly string[]).includes(String(v ?? ""));
}

export function normalizeCategory(v: unknown): Category | null {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "listening" || s === "vocabulary" || s === "grammar" ? s : null;
}

export function normalizeSource(v: unknown): LessonSource | null {
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "listening" || s === "listening_transcript" || s === "transcript") return "listening";
  if (s === "learn" || s === "vocabulary" || s === "learn_card") return "learn";
  if (s === "grammar" || s === "grammar_card") return "grammar";
  if (s === "speaking" || s === "speaking_card") return "speaking";
  return null;
}

/* ------------------------------- wording -------------------------------- */

/**
 * Instructional stems that make a question sound like task instructions
 * instead of a teacher asking about the lesson. Questions containing these
 * are discarded before saving.
 */
export const FORBIDDEN_STEMS: string[] = [
  // Arabic (tashkeel is stripped before matching)
  "اكمل الحوار",
  "اكمل الجملة التالية",
  "اكمل الجمله التاليه",
  "اقرا الحوار",
  "اقرا النص",
  "اقرا ثم",
  "استمع ثم",
  "استمع الى الحوار",
  "اختر الاجابة الصحيحة",
  "اختر الاجابه الصحيحه",
  "انظر الى الصورة",
  "انظر الى الصوره",
  "شاهد الفيديو",
  "بناء على الحوار",
  "حسب الحوار",
  "لماذا",
  // English
  "complete the dialogue",
  "complete the following sentence",
  "listen and answer",
  "listen then",
  "read then answer",
  "read the dialogue",
  "look at the image",
  "look at the picture",
  "watch the video",
  "based on the dialogue",
  "choose the correct answer",
  "why do you think",
];

export const MAX_QUESTION_WORDS = 8;

/** Strip Arabic diacritics + tatweel so wording checks are robust. */
export function stripTashkeel(s: string): string {
  return (s ?? "").replace(/[\u064B-\u065F\u0670\u0640]/g, "");
}

export function norm(s: unknown): string {
  return stripTashkeel(String(s ?? "")).replace(/\s+/g, " ").toLowerCase().trim();
}

/**
 * Teacher-style wording gate.
 * `word_ordering` prompts are short ordering instructions (e.g. "رتب الكلمات.").
 */
export function checkWording(question: unknown, questionType?: unknown): { ok: boolean; reason?: string } {
  const raw = String(question ?? "").trim();
  if (!raw) return { ok: false, reason: "empty question" };

  const n = norm(raw);
  for (const stem of FORBIDDEN_STEMS) {
    if (n.includes(norm(stem))) return { ok: false, reason: `instructional stem: "${stem}"` };
  }

  // Only one sentence: no more than one terminal punctuation mark inside.
  const terminals = (raw.match(/[.!؟?]/g) ?? []).length;
  const endsWithTerminal = /[.!؟?]\s*$/.test(raw);
  if (terminals > (endsWithTerminal ? 1 : 0)) {
    return { ok: false, reason: "more than one sentence" };
  }

  // Length budget.
  const limit = MAX_QUESTION_WORDS;
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > limit) return { ok: false, reason: `too long (${words.length} words > ${limit})` };

  return { ok: true };
}

/* --------------------------- word ordering ------------------------------ */

/**
 * Validate a word_ordering question: options are the scrambled tokens, and
 * correct_answer is the ordered array (or the full sentence string).
 * Returns a normalized {options, correct_answer} pair or null when unusable.
 */
export function normalizeWordOrdering(
  q: any,
): { options: string[]; correct_answer: string[] } | null {
  const toTokens = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return String(v ?? "").trim().split(/\s+/).filter(Boolean);
  };
  const answer = toTokens(q?.correct_answer);
  let options = toTokens(q?.options);
  if (answer.length < 3 || answer.length > 6) return null;
  // Options must be exactly the same multiset as the answer tokens.
  if (options.length !== answer.length) options = answer.slice();
  const sortKey = (a: string[]) => a.map((w) => norm(w)).sort().join("|");
  if (sortKey(options) !== sortKey(answer)) options = answer.slice();
  return { options: shuffle(options), correct_answer: answer };
}

/* ------------------------------ image checks ---------------------------- */

/**
 * Confirm an image URL is present, allowed and actually reachable.
 * Any failure means the question must NOT be published as an image question.
 */
export async function verifyImageUrl(
  url: unknown,
  allowed: Set<string>,
): Promise<boolean> {
  const u = String(url ?? "").trim();
  if (!u || !/^https?:\/\//i.test(u)) return false;
  if (allowed.size > 0 && !allowed.has(u)) return false;
  try {
    let res = await fetch(u, { method: "HEAD" });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(u, { method: "GET", headers: { Range: "bytes=0-0" } });
    }
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    return ct === "" || ct.startsWith("image/");
  } catch {
    return false;
  }
}

/**
 * Downgrade a would-be image question to a plain multiple-choice question.
 * Returns null when the question cannot stand on its own without the image.
 */
export function downgradeImageQuestion(q: any): any | null {
  const opts = Array.isArray(q?.options) ? q.options.map((o: any) => String(o)).filter(Boolean) : [];
  const correct = String(q?.correct_answer ?? "");
  if (opts.length < 2 || !correct || !opts.some((o: string) => norm(o) === norm(correct))) return null;
  return { ...q, question_type: "multiple_choice", image_url: null };
}


/* ------------------------------ grounding ------------------------------- */

export interface LessonMaterials {
  transcript: string | null;
  learn: any[];
  grammar: any[];
  speaking: any[];
}

/**
 * Normalized haystack of everything actually taught in this lesson.
 * `lesson_topic` and unit titles are deliberately EXCLUDED — they are context
 * only and must never be enough to justify a question.
 */
export function buildLessonHaystack(m: LessonMaterials): string {
  const parts: string[] = [];
  if (m.transcript) parts.push(m.transcript);
  for (const c of [...(m.learn ?? []), ...(m.grammar ?? []), ...(m.speaking ?? [])]) {
    parts.push(c?.arabic_text ?? "", c?.english_translation ?? "", c?.transliteration ?? "", c?.notes ?? "");
  }
  return norm(parts.join(" \n "));
}

export function toStrArr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean).slice(0, 20);
  return [String(v)];
}

/** A question is grounded when at least one cited token appears in the lesson. */
export function isGrounded(q: any, haystack: string): boolean {
  const tokens = [
    ...toStrArr(q?.vocabulary_used),
    ...toStrArr(q?.grammar_concepts_used),
    ...toStrArr(q?.lesson_concepts),
  ];
  if (tokens.length === 0) return false;
  return tokens.some((t) => {
    const n = norm(t);
    return n.length >= 2 && haystack.includes(n);
  });
}

/** Listening questions must trace to the transcript specifically. */
export function isListeningGrounded(q: any, transcript: string | null): boolean {
  if (!transcript) return false;
  const hay = norm(transcript);
  const tokens = [...toStrArr(q?.lesson_concepts), ...toStrArr(q?.vocabulary_used)];
  return tokens.some((t) => {
    const n = norm(t);
    return n.length >= 2 && hay.includes(n);
  });
}

/* ----------------------------- deduplication ---------------------------- */

/** Jaccard similarity over normalized word sets. */
export function similarity(a: string, b: string): number {
  const sa = new Set(norm(a).split(/\s+/).filter(Boolean));
  const sb = new Set(norm(b).split(/\s+/).filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** Remove near-duplicate questions (same wording or same correct answer + stem). */
export function dedupeQuestions(list: any[], threshold = 0.8): any[] {
  const kept: any[] = [];
  for (const q of list) {
    const text = String(q?.question ?? "");
    const dup = kept.some((k) => similarity(String(k.question ?? ""), text) >= threshold);
    if (!dup) kept.push(q);
  }
  return kept;
}

/* -------------------------------- shuffle ------------------------------- */

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Enforce exactly 3 options on multiple-choice-style types. */
export function clampMcOptions(q: any): any {
  if (!MC_OPTION_TYPES.has(String(q?.question_type))) return q;
  const opts = Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [];
  if (opts.length <= 3) return q;
  const correct = String(q.correct_answer ?? "");
  const distractors = shuffle(opts.filter((o: string) => o !== correct));
  return { ...q, options: [correct, ...distractors.slice(0, 2)] };
}

/** Option order carries the answer for these types — never shuffle them. */
const ORDER_IS_ANSWER = new Set(["sentence_ordering", "word_ordering"]);
export function shuffleOptions(q: any): any {
  if (
    !ORDER_IS_ANSWER.has(String(q?.question_type)) &&
    Array.isArray(q?.options) &&
    q.options.every((o: any) => typeof o === "string")
  ) {
    q.options = shuffle(q.options);
  }
  return q;
}

/* ----------------------------- prompt blocks ---------------------------- */

/** The wording contract, shared verbatim by both generation paths. */
export const WORDING_RULES_PROMPT = `## QUESTION WORDING (HARD REQUIREMENT)
Write like a teacher asking a student about the lesson they just finished — NOT like exam instructions.

RULES
  • ONE short sentence. Target ${MAX_QUESTION_WORDS} Arabic words or fewer.
  • No task instructions, no framing, no preamble.
  • Never start with or contain: "أكمل…", "اقرأ الحوار…", "استمع ثم…", "اختر الإجابة الصحيحة…",
    "أكمل الجملة التالية…", "انظر إلى الصورة…", "Complete the dialogue…", "Listen and answer…",
    "Read then answer…". Questions containing these are DISCARDED.
  • Never ask "لماذا" / "why".

GOOD (copy this feel)
  مَنْ هَذَا؟
  أَيْنَ الْوَلَدُ؟
  مَاذَا قَالَ الْأَبُ؟
  مَا حَيَوَانُ نَدَى الْمُفَضَّلُ؟
  مَا مَعْنَى "كِتَابْ"؟

BAD (never produce)
  أكمل سؤال الأب في الحوار التالي ثم اختر الإجابة الصحيحة.
  اقرأ الحوار ثم أجب عن السؤال.
  استمع إلى الفيديو ثم اختر ما قاله الولد.

For fill_in_blank: write ONLY the short sentence with "____" in it. No instruction line before it.`;

/** The lesson-source contract, shared verbatim by both generation paths. */
export const SOURCE_CONTRACT_PROMPT = `## LESSON SOURCES (THE ONLY ALLOWED SOURCES)
  1. Listening Transcript — the dialogue/script the admin wrote.
  2. Learn cards — taught vocabulary.
  3. Grammar cards — taught grammar rules.
  4. Speaking cards — taught phrases/sentences (if present).

ABSOLUTE RULES
  • A question may ONLY ask about something present in one of those four sources.
  • Listening questions come ONLY from the Listening Transcript. Never from the unit title,
    the lesson topic, or a guess about what the video said. If there is no transcript,
    produce ZERO listening questions.
  • The unit title and lesson topic are CONTEXT ONLY — never a source of questions.
  • No outside knowledge, no cultural trivia, no inference, no prediction, no invented
    situations, no untaught vocabulary.
  • Each question references EXACTLY ONE source. Report it in "source" as one of:
    "listening" | "learn" | "grammar" | "speaking", report the specific item index
    in "source_index" (1-based card number; use 0 for the transcript), and report in
    "source_snippet" the EXACT sentence or fragment from that item the question is
    based on — copy it verbatim, never paraphrase, never write a label like "Learn Card #12".
  • Cite the exact strings you used in "lesson_concepts" / "vocabulary_used" /
    "grammar_concepts_used" — they must appear verbatim in the materials.
    "lesson_concepts" holds educational concepts ONLY — never source labels.`;

export const TYPE_RULES_PROMPT = `## ALLOWED question types (ONLY these)
  • multiple_choice          — EXACTLY 3 options, 1 correct + 2 lesson-based distractors.
  • grammar_selection        — correct grammar form inside a short taught sentence.
  • conversation_completion  — missing turn in a short taught dialogue.
  • vocab_in_context         — taught word's meaning inside a short taught sentence.
  • fill_in_blank            — short sentence with "____", EXACTLY 3 candidate fills.
  • matching                 — 3 {"left","right"} pairs from the lesson.
  • image_question           — pick the correct image for a taught word (listed URLs only).
  • choose_correct_sentence  — pick the correct taught sentence.

FORBIDDEN types: true_false, reading_comprehension, listening_comprehension,
sentence_ordering, word_ordering, find_the_mistake, open-ended/short-answer,
select-all/multi-select, and anything not listed above.

## FORMAT (strict)
- MC-style types (multiple_choice, grammar_selection, conversation_completion, vocab_in_context,
  choose_correct_sentence, image_question, fill_in_blank): options is EXACTLY 3 strings;
  correct_answer is one of those strings.
- matching: options is 3 {"left","right"} pairs; correct_answer is {"<left>":"<right>", ...}.
- image_question: "image_url" MUST be one of the URLs listed in the materials.

## DIFFICULTY
Every question is "easy": direct, confidence-building, lesson-based. No puzzles,
no reasoning chains, no near-identical trap distractors. Distractors are plausible
items drawn from the SAME lesson. Arabic must be fully vowelized (tashkeel).`;

/* ----------------------------- normalizers ------------------------------ */

export const OBJECTIVES = new Set([
  "vocabulary_recognition", "vocabulary_usage", "grammar_recognition", "grammar_usage",
  "listening_comprehension", "listening_inference", "reading_comprehension", "reading_inference",
  "sentence_construction", "word_order", "image_interpretation", "context_understanding",
  "everyday_communication",
]);

export function normalizeObjective(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).toLowerCase().replace(/\s+/g, "_");
  return OBJECTIVES.has(s) ? s : null;
}

export function normalizeCognitiveLevel(v: unknown): number | null {
  const n = Math.round(Number(v));
  return n >= 1 && n <= 4 ? n : null;
}

export function normalizeEstimatedTime(v: unknown): number | null {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(10, Math.min(300, n));
}

export function normalizeQualityScore(v: unknown): number | null {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

/** Internal-only traceability metadata stored in `source_metadata` (jsonb). */
export interface SourceMetadata {
  source_type: LessonSource;
  source_id: number;
  source_snippet: string;
}

/**
 * Build the admin-only traceability object for a generated question.
 * `snippet` should be the exact sentence/fragment the question came from;
 * if the model omits it we fall back to the raw item text passed in.
 */
export function buildSourceMetadata(
  source: LessonSource,
  index: unknown,
  snippet: unknown,
  fallbackSnippet?: unknown,
): SourceMetadata {
  const id = Math.max(0, Math.round(Number(index) || 0));
  const text = String(snippet ?? "").trim() || String(fallbackSnippet ?? "").trim();
  return {
    source_type: source,
    source_id: id,
    source_snippet: text.slice(0, 1000),
  };
}

