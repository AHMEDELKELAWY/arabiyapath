// Public payload serializers per question_type.
// Adding a new type = register a serializer; the engine itself does not change.

export interface RawQuestion {
  id: string;
  type: string | null;
  question_type: string | null;
  difficulty: string | null;
  prompt: string;
  options_json: unknown;
  audio_url: string | null;
  metadata: Record<string, unknown> | null;
}

export interface PublicQuestion {
  id: string;
  question_type: string;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  audio_url: string | null;
  options: string[];
  metadata: Record<string, unknown>;
  // Legacy sub-variant (e.g. "text" | "audio") preserved for existing renderers.
  type: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeDifficulty(d: string | null): "easy" | "medium" | "hard" {
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return "medium";
}

type Serializer = (q: RawQuestion) => PublicQuestion;

const multipleChoice: Serializer = (q) => ({
  id: q.id,
  question_type: "multiple_choice",
  difficulty: normalizeDifficulty(q.difficulty),
  prompt: q.prompt,
  audio_url: q.audio_url,
  options: shuffle(Array.isArray(q.options_json) ? (q.options_json as string[]) : []),
  metadata: q.metadata ?? {},
  type: q.type,
});

// Registry — future types (image_to_word, fill_blank, ...) add entries here.
const SERIALIZERS: Record<string, Serializer> = {
  multiple_choice: multipleChoice,
};

export function serializeQuestion(q: RawQuestion): PublicQuestion {
  const key = q.question_type || "multiple_choice";
  const fn = SERIALIZERS[key] ?? multipleChoice;
  return fn(q);
}
