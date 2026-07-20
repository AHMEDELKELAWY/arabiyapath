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

/** The exact text sent to the vision validator for vocabulary images. */
export function buildVocabularyValidatorPrompt(vocabulary: string): string {
  return (
    `Vocabulary word: "${vocabulary}".\n` +
    `Judge the image against these rules:\n` +
    `1. Photorealistic real-life photograph (NOT illustration, cartoon, drawing, 3D render, painting).\n` +
    `2. Contains NO visible text, letters, numbers, captions, signs, logos, or watermarks.\n` +
    `3. Depicts exactly ONE clear subject — no split screens, no multi-panel, no collage.\n` +
    `4. The subject unambiguously represents the vocabulary word.\n` +
    `Reply with strict JSON: {"photoreal":bool,"noText":bool,"oneConcept":bool,"matchesVocab":bool,"issues":[string]}`
  );
}

/**
 * Detect whether a grammar item is a question word (interrogative).
 * Matches trailing "?" plus common English question words used in the
 * curriculum (who / what / where / when / why / how / which / whose / whom
 * and multi-word variants like "how many", "how much").
 */
export function isQuestionWord(vocabulary: string): boolean {
  const v = String(vocabulary ?? "").trim().toLowerCase();
  if (!v) return false;
  if (/\?\s*$/.test(v)) return true;
  const stripped = v.replace(/[^a-z\s]/g, "").trim();
  return /^(who|whom|whose|what|where|when|why|how|which|how many|how much|how long|how often)\b/.test(stripped);
}

/** The exact text sent to the vision validator for grammar images. */
export function buildGrammarValidatorPrompt(vocabulary: string): string {
  const questionWord = isQuestionWord(vocabulary);
  const askingRule = questionWord
    ? `\n8. momentOfAsking: Because "${vocabulary}" is a question word, the image MUST capture a live moment of ASKING — visible inquiry through open mouth mid-speech, raised eyebrows, curious/puzzled expression, hand gesture of inquiry (open palm, pointing, or shrug), or leaning forward toward the listener. A static portrait, posed smile, or still object scene = INVALID.`
    : "";
  const askingKey = questionWord ? `,"momentOfAsking":bool` : "";
  return (
    `Arabic grammar item being taught: "${vocabulary}".\n` +
    `This image must TEACH the grammatical function through an everyday conversational scene — not depict the word literally.\n` +
    `Judge the image against ALL of these rules. Any single failure = invalid.\n` +
    `1. photoreal: Photorealistic real-life photograph (NOT illustration, cartoon, drawing, 3D render, painting, clipart, icon, infographic, screenshot, UI element).\n` +
    `2. noText: Contains NO visible text of any kind — no Arabic letters, no English letters, no numbers, no captions, no subtitles, no signs, no labels, no logos, no watermarks, no writing on objects or clothing, no speech bubbles with writing.\n` +
    `3. oneScene: Shows ONE clear scene (2–3 Arab people unless the concept genuinely needs more) — no split screens, no multi-panel, no collage, no unrelated objects.\n` +
    `4. arabPeople: The people depicted are clearly Arab; women wear modest clothing / hijab where appropriate; clothing and setting are culturally authentic.\n` +
    `5. notLiteral: The image does NOT try to literally depict the grammar word itself (e.g. for "when?" it does not show a giant clock as the subject; for "who?" it does not show a question mark).\n` +
    `6. teachesGrammar: The interaction, gestures, and facial expressions clearly communicate the grammatical function so a beginner can INFER the meaning from the situation alone.\n` +
    `7. unambiguous: The scene could not reasonably teach a DIFFERENT grammar meaning; the communicative situation is immediately obvious.` +
    askingRule + `\n` +
    `Reply with strict JSON: {"photoreal":bool,"noText":bool,"oneScene":bool,"arabPeople":bool,"notLiteral":bool,"teachesGrammar":bool,"unambiguous":bool${askingKey},"issues":[string]}`
  );
}

/**
 * Build the enforced prompt for a GRAMMAR image.
 *
 * Grammar cards teach function words (pronouns, question words, particles,
 * prepositions, connectors). A literal depiction rarely conveys meaning, so
 * we ask for an educational everyday scene where a learner can infer the
 * grammatical function from the interaction between Arab people.
 *
 * Question words receive an extra "moment of asking / curiosity / inquiry"
 * directive so the scene captures the act of questioning rather than a
 * static portrait or object.
 */
export function buildGrammarImagePrompt(vocabulary: string): string {
  const questionWord = isQuestionWord(vocabulary);
  const askingDirective = questionWord
    ? `CRITICAL — QUESTION WORD: "${vocabulary}" is an interrogative. The image MUST capture a live moment of ASKING, curiosity, or inquiry — never a static object, still-life, or posed portrait. Show one person actively asking another: mouth slightly open mid-speech, raised eyebrows, a puzzled or curious expression, and an inquiry gesture (open palm up, pointing, a light shrug, or leaning forward toward the listener). The listener should be visibly attending to the question. Frame the scene as a candid mid-conversation moment, not a smiling group photo.`
    : "";
  return [
    `Ultra-realistic photograph — a single frame from a real-life conversation — that teaches the MEANING and CONVERSATIONAL USAGE of the Arabic grammar item: "${vocabulary}".`,
    `The image must illustrate the GRAMMATICAL FUNCTION of this item, not its translation, and MUST NOT literally depict the word itself. A learner should infer the meaning from the situation alone.`,
    askingDirective,
    `Scene: 2–3 Arab people (a friendly Arab family or Arab friends) in a simple everyday setting. Communicate the grammar meaning entirely through facial expressions, body language, gestures, and the interaction between the people.`,
    `Examples of the required approach: for "who?" one person asks another about a third person's identity with a curious expression and open-palm gesture; for "where?" someone asks with a searching look while gesturing outward; for "what?" someone points to an object mid-question with raised eyebrows; for "when?" someone asks about time with an inquiring expression (a clock may appear in the background, but the clock is NEVER the subject); for "how?" someone gestures for an explanation; for "why?" someone shows curiosity with a slight shrug or puzzled look.`,
    `Visual style: photorealistic, professional DSLR photography, bright natural daylight, warm educational atmosphere, clean uncluttered background, authentic Arab clothing, modest clothing and hijab for women where appropriate, natural candid expressions (not posed studio smiles), family-safe.`,
    `Composition: focus on the interaction; the main communicative action must be immediately obvious; no visual distractions; no unrelated objects.`,
    `Absolutely NO text of any kind anywhere in the image: no Arabic letters, no English letters, no numbers, no captions, no subtitles, no signs, no road signs, no labels, no logos, no watermarks, no speech bubbles containing writing, no writing on objects or clothing.`,
    `NO illustrations, NO cartoons, NO 3D renders, NO drawings, NO paintings, NO clipart, NO icons, NO infographics, NO screenshots, NO UI elements, NO symbolic or abstract art, NO collages, NO split screens, NO multi-panel compositions.`,
  ].filter(Boolean).join(" ");
}

/**
 * Post-generation validator for grammar images. Looser than the vocabulary
 * validator: we do not require the image to visually match the grammar word
 * itself — only that it is a photorealistic, text-free, single-scene image
 * of people whose interaction plausibly teaches a grammatical function.
 */
export async function validateGrammarImage(
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
              "You are a strict validator for Arabic grammar teaching images. Return ONLY compact JSON.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: buildGrammarValidatorPrompt(vocabulary) },
              { type: "image_url", image_url: { url: `data:image/png;base64,${b64Png}` } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return { valid: true, issues: [] };
    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { valid: true, issues: [] };
    const parsed = JSON.parse(match[0]);
    const issues: string[] = Array.isArray(parsed.issues) ? parsed.issues.slice(0, 8) : [];
    const checks: Array<[keyof typeof parsed, string]> = [
      ["photoreal", "not photorealistic"],
      ["noText", "contains visible text"],
      ["oneScene", "more than one scene / collage / split"],
      ["arabPeople", "people are not clearly Arab / culturally inappropriate"],
      ["notLiteral", "literally depicts the grammar word instead of its usage"],
      ["teachesGrammar", "scene does not teach the grammar function"],
      ["unambiguous", "scene is ambiguous — could teach the wrong meaning"],
    ];
    let valid = true;
    for (const [key, msg] of checks) {
      if (parsed[key] !== true) {
        valid = false;
        if (parsed[key] === false) issues.push(msg);
      }
    }
    return { valid, issues };
  } catch {
    return { valid: true, issues: [] };
  }
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
