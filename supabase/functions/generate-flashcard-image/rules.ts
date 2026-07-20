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
 * Pre-generation: reject only inputs that clearly encode multiple concepts,
 * complete sentences, or lists. The rule is "one concept" — semantic, not
 * purely textual.
 *
 * ACCEPTED (single concept):
 *   - single nouns, proper nouns, adjectives, pronouns ("this", "that")
 *   - occupations ("police officer"), locations ("living room")
 *   - short noun phrases for ONE object ("car keys", "coffee cup",
 *     "credit card", "bus stop", "dining table", "mobile phone")
 *   - question words with a trailing "?"  ("Who?", "Where?", "How many?")
 *
 * REJECTED:
 *   - complete sentences (conjugated verbs joining subject+object,
 *     sentence-ending ".", "!")
 *   - lists: commas, slashes, semicolons
 *   - conjunctions joining separate concepts: " and ", " or ", "&"
 *   - obviously long strings (> 60 chars or > 8 words)
 */
export function validateVocabularyConcept(raw: string): { valid: boolean; reason?: string } {
  const v = String(raw ?? "").trim();
  if (!v) return { valid: false, reason: "Vocabulary is empty." };
  if (v.length > 60) {
    return { valid: false, reason: `Too long (${v.length} chars). Vocabulary items should be under 60 characters — write a single concept, not a sentence.` };
  }

  // Lists / separators clearly encode multiple concepts.
  if (/,/.test(v)) return { valid: false, reason: "Comma detected — looks like a list of multiple concepts. Enter one vocabulary item per card." };
  if (/;/.test(v)) return { valid: false, reason: "Semicolon detected — looks like multiple concepts. Enter one vocabulary item per card." };
  if (/\//.test(v)) return { valid: false, reason: "Slash detected — looks like alternative concepts. Pick one vocabulary item per card." };
  if (/&/.test(v)) return { valid: false, reason: "Ampersand detected — looks like two concepts joined. Enter one vocabulary item per card." };

  const lower = ` ${v.toLowerCase()} `;
  if (/\s(and|or)\s/.test(lower)) {
    return { valid: false, reason: 'Conjunction ("and" / "or") joins separate concepts. Enter one vocabulary item per card.' };
  }

  // Allow a single trailing "?" for question words. Reject other sentence punctuation.
  const withoutTrailingQ = v.replace(/\?+\s*$/, "");
  if (/[.!;:]/.test(withoutTrailingQ)) {
    return { valid: false, reason: "Sentence punctuation (. ! ; :) suggests a full sentence. Vocabulary should be a single word or short noun phrase." };
  }
  if (/\?/.test(withoutTrailingQ)) {
    return { valid: false, reason: "Question mark in the middle of the phrase — only a trailing '?' is allowed (e.g. 'Who?', 'Where?')." };
  }

  // Sentence structure: conjugated verbs signal a full sentence, not a vocab item.
  // Allow infinitives ("to be", "to have", "to run").
  if (!/^to\s/i.test(v) && /\b(is|are|was|were|has|have|had|will|would|do|does|did)\b/i.test(v)) {
    return { valid: false, reason: "Looks like a full sentence (contains a conjugated verb). Use a single word or noun phrase — e.g. 'coffee cup' instead of 'the cup is on the table'." };
  }

  const words = v.split(/\s+/).filter(Boolean);
  if (words.length > 8) {
    return { valid: false, reason: `Too many words (${words.length}). Vocabulary items are usually 1–4 words describing one concept.` };
  }

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
