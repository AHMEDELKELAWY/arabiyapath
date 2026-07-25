# Assessment Generation Redesign — `int-test/v7-source-grounded`

Only the generation pipeline and its lesson inputs change. Test Editor, Student Preview, draft/publish, manual editing, regeneration UI, the assessment runner, question types, answer validation, and RLS all keep working exactly as today.

## 1. Listening Transcript (the one schema change)

Add nullable `listening_transcript text` to `flashcard_units`. Nothing else in the database is touched.

Admin: a **Listening Transcript** textarea inside the existing Listening tab, in the same card style and same save pattern as the YouTube URL field.

Generation rules:
- Listening questions are generated **only** from this transcript.
- `lesson_topic` is demoted to context only — never a listening source, never used to guess dialogue.
- Empty transcript → zero listening questions, its share redistributed to the other sources, generation still succeeds.

## 2. Lesson sources (only these)

| Source | Data |
|---|---|
| Listening Transcript | `flashcard_units.listening_transcript` |
| Learn | `flashcards` where `kind = 'learn'`, published |
| Grammar | `flashcards` where `kind = 'grammar'`, published |
| Speaking | `flashcards` where `kind = 'speaking'`, published (newly added; auto-skipped when absent) |

Any empty source is skipped silently.

## 3. Dynamic distribution — no fixed numbers

The current hardcoded 8/6/6 pool of 20 is removed entirely. Instead the generator computes a *weight* per source from the actual lesson content:

```text
learnWeight    = learnCards      x questionsPerCard
grammarWeight  = grammarCards    x questionsPerCard
speakingWeight = speakingCards   x questionsPerCard
listenWeight   = transcript utterance/sentence count x questionsPerUtterance

poolTarget = clamp(sum(weights), 20, 40)
share(source) = round(poolTarget * weight / totalWeight)
```

Small lessons naturally produce small pools; content-rich lessons approach 40. Sources with weight 0 drop out and their share is redistributed proportionally. No constant anywhere states "8 listening" or similar — only the 20–40 safety clamp the brief specifies.

## 4. Multiple questions per lesson item

The prompt explicitly asks for several angles per item: a Learn card may yield meaning / vocabulary / fill-blank / image / context questions; a Grammar card several rule checks; the transcript several comprehension questions; a Speaking card several simple prompts. Existing question types only — nothing new introduced.

## 5. Teacher-style wording (hard gate)

Enforced twice: in the prompt, and by a post-generation filter that discards violations **before** saving.

- One short sentence, target ≤ 8 Arabic words.
- Rejected stems: `أكمل`, `اقرأ الحوار`, `استمع ثم`, `اختر الإجابة الصحيحة`, `أكمل الجملة التالية`, `انظر إلى الصورة`, plus the English equivalents ("Complete the dialogue", "Listen and answer", "Read then answer").
- Target shapes: `مَنْ هَذَا؟` · `أَيْنَ الْوَلَدُ؟` · `مَاذَا قَالَ الْأَبُ؟` · `مَا مَعْنَى …؟`

Fill-in-the-blank keeps its blank in the sentence but loses the instructional preamble.

## 6. Grounding + traceability

- Every question must be answerable from exactly one source; the grounding haystack is rebuilt from transcript + learn + grammar + speaking (title/`lesson_topic` no longer sufficient).
- Each question carries an internal source label (`Listening Transcript`, `Learn Card #12`, `Grammar Card #4`, `Speaking Card #3`).
- **No schema change for this:** the label is stored in the existing unused-by-students `learning_objective` text column, which the Test Editor already renders as an admin-only field. Students never see it — the runner does not read that column.
- Improved dedupe: normalized-prompt similarity check removes near-duplicate questions so a 30-item pool is 30 distinct items.

## 7. Difficulty

Back to the original Beginner philosophy: easy, direct, confidence-building, lesson-based. No "why", no inference, no puzzles, no untaught vocabulary. Difficulty stays `easy`.

## 8. Randomization

Each attempt draws a different subset from the pool, weighted across whichever categories exist, instead of assuming a fixed 8/6/6 pool of 20. Selection logic only — runner UI, scoring, review, and student workflow untouched.

## 9. Files to change and why

| File | Why |
|---|---|
| new migration | Add `listening_transcript` to `flashcard_units` |
| `src/pages/admin/AdminIntermediateUnit.tsx` | Listening tab needs the transcript textarea + save |
| `supabase/functions/_shared/assessment-rules.ts` (new) | Single home for lesson-source contract, wording rules, allowed types, grounding + validation — ends the current duplication between the two functions |
| `supabase/functions/generate-intermediate-test/index.ts` | Fetch transcript & speaking cards, dynamic distribution, teacher-style prompt, source metadata, wording validation, better dedupe |
| `supabase/functions/regenerate-intermediate-question/index.ts` | Same sources, same wording rules, and grounding validation it currently lacks |
| `src/components/flashcards/msa/IntermediateTestRunner.tsx` | Pool selection only, so a 20–40 dynamic pool with variable categories still yields a full attempt |
| `src/integrations/supabase/types.ts` | Regenerated after the migration |

Version tag becomes `int-test/v7-source-grounded`.

## 10. Verification

- Unit with a transcript → listening questions quote the transcript only.
- Blank transcript → zero listening questions, share redistributed, generation succeeds.
- Unit with/without speaking cards → included / silently skipped.
- Tiny lesson → small pool; rich lesson → approaches 40.
- Every saved question shows its source label in the Test Editor; nothing new appears to students.
- Two runner attempts on the same unit → different question sets.
- Test Editor edit / reorder / add / delete / publish and Student Preview behave identically.
