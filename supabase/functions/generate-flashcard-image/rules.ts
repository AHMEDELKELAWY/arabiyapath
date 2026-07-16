/**
 * Learn vocabulary image-generation rules (server-side enforcement).
 *
 * Mirrors mem://features/learn-image-generation-rules:
 *   - One concept per image (single vocabulary item).
 *   - Real-life photograph only — no illustrations, cartoons, 3D renders.
 *   - No text, captions, subtitles, logos, watermarks, or written words.
 *   - Clear, unambiguous subject that teaches meaning without translation.
 *
 * This module is the single source of truth for the prompt and the
 * post-generation validator used by generate-flashcard-image.
 */

/** Normalize a vocabulary string for canonical-image reuse lookups. */
export function normalizeVocabulary(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")   // drop parentheticals
    .replace(/[^a-z0-9\s]/g, " ") // drop punctuation
    .replace(/\b(a|an|the|to)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pre-generation: reject inputs that clearly encode multiple concepts,
 * sentences, or ambiguous phrases. Learn cards must be a single vocabulary
 * item ("apple", "to run", "red car"), not a sentence or list.
 */
export function validateVocabularyConcept(raw: string): { valid: boolean; reason?: string } {
  const v = String(raw ?? "").trim();
  if (!v) return { valid: false, reason: "empty vocabulary" };
  if (v.length > 60) return { valid: false, reason: "too long — vocabulary items should be short (<60 chars)" };

  // Sentence terminators or question marks
  if (/[.?!;:]/.test(v)) return { valid: false, reason: "contains sentence punctuation" };

  // Multi-concept separators: comma, slash, ' and ', ' or ', ' & '
  const normalized = ` ${v.toLowerCase()} `;
  if (/[,/]/.test(v)) return { valid: false, reason: "comma or slash suggests multiple concepts" };
  if (/\s(and|or)\s/.test(normalized)) return { valid: false, reason: "conjunction suggests multiple concepts" };
  if (/&/.test(v)) return { valid: false, reason: "ampersand suggests multiple concepts" };

  // Too many words = likely a sentence, not a vocab item
  const words = v.split(/\s+/).filter(Boolean);
  if (words.length > 6) return { valid: false, reason: `too many words (${words.length}) — likely a sentence` };

  return { valid: true };
}

/** Build the enforced prompt for a vocabulary image. */
export function buildVocabularyImagePrompt(vocabulary: string): string {
  return [
    `Ultra-realistic, photorealistic real-life photograph of a single subject: ${vocabulary}.`,
    `Exactly ONE clear concept — the subject fills the frame and is instantly recognizable.`,
    `Natural lighting, real-world setting, professional DSLR photography, shallow depth of field where appropriate.`,
    `Absolutely NO text of any kind: no captions, no subtitles, no letters, no numbers, no signs, no labels, no logos, no watermarks, no writing on objects.`,
    `NO illustrations, NO cartoons, NO 3D renders, NO drawings, NO paintings, NO clip art, NO collages, NO split screens, NO multi-panel compositions.`,
    `No people unless the vocabulary explicitly refers to a person or human action.`,
    `Simple uncluttered background so the vocabulary meaning is unambiguous.`,
  ].join(" ");
}

/**
 * Post-generation: use a vision model to verify the produced image obeys the
 * rules. Returns { valid, issues[] }.
 *
 * Uses google/gemini-3-flash-preview via the same Lovable AI Gateway (chat
 * completions with image input). Failure to reach the validator is treated
 * as a soft-pass so generation isn't blocked by a validator outage.
 */
export async function validateGeneratedImage(
  b64Png: string,
  vocabulary: string,
  apiKey: string,
): Promise<{ valid: boolean; issues: string[] }> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a strict validator for vocabulary teaching images. Return ONLY compact JSON.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Vocabulary word: "${vocabulary}".\n` +
                  `Judge the image against these rules:\n` +
                  `1. Photorealistic real-life photograph (NOT illustration, cartoon, drawing, 3D render, painting).\n` +
                  `2. Contains NO visible text, letters, numbers, captions, signs, logos, or watermarks.\n` +
                  `3. Depicts exactly ONE clear subject — no split screens, no multi-panel, no collage.\n` +
                  `4. The subject unambiguously represents the vocabulary word.\n` +
                  `Reply with strict JSON: {"photoreal":bool,"noText":bool,"oneConcept":bool,"matchesVocab":bool,"issues":[string]}`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${b64Png}` },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("[image-rules] validator http error, soft-passing:", res.status);
      return { valid: true, issues: [] };
    }
    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("[image-rules] validator returned non-JSON, soft-passing:", raw.slice(0, 200));
      return { valid: true, issues: [] };
    }
    const parsed = JSON.parse(match[0]);
    const issues: string[] = Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [];
    const valid =
      parsed.photoreal === true &&
      parsed.noText === true &&
      parsed.oneConcept === true &&
      parsed.matchesVocab === true;
    if (!valid) {
      if (parsed.photoreal === false) issues.push("not photorealistic");
      if (parsed.noText === false) issues.push("contains visible text");
      if (parsed.oneConcept === false) issues.push("more than one concept");
      if (parsed.matchesVocab === false) issues.push("does not match vocabulary");
    }
    return { valid, issues };
  } catch (e) {
    console.warn("[image-rules] validator threw, soft-passing:", e);
    return { valid: true, issues: [] };
  }
}
