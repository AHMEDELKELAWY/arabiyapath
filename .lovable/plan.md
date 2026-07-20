# Future-Proof Quiz Engine

Scope: `quiz_questions` (legacy Gulf/Fusha lesson quizzes served by `start-quiz` / `submit-quiz`). The Intermediate `flashcard_unit_tests` engine is untouched.

## 1. Schema changes (single migration)

`quiz_questions`
- add `difficulty text` with CHECK in (`easy`,`medium`,`hard`), default `medium`, nullable-tolerant (treated as `medium`).
- add `question_type text not null default 'multiple_choice'` (rename intent of existing `type` — see Technical Notes).
- add `metadata jsonb not null default '{}'::jsonb` for per-type extras (image_url, audio_url variants, blanks, etc.) so future types don't require schema changes.

New table `public.quiz_attempt_questions`
- columns: `id uuid pk`, `attempt_id uuid fk → quiz_attempts(id) on delete cascade`, `question_id uuid fk → quiz_questions(id) on delete cascade`, `was_correct boolean`, `created_at`.
- unique(`attempt_id`,`question_id`).
- GRANTs: `authenticated` select/insert on own rows via `quiz_attempts.user_id`; `service_role` all. RLS: users can read rows where their attempt; only edge function (service role) writes.
- Indexes: `(attempt_id)`, `(question_id)`.

New view/materialization is not needed — we derive per-user history with SQL.

## 2. `start-quiz` — adaptive selection

Replace the current "shuffle and slice" with a weighted, layered picker:

```text
Step A  Fetch pool (all questions for quiz_id) with difficulty + question_type.
Step B  Fetch last attempt's question IDs for this user+quiz (recentIds).
Step C  Fetch per-user history for these questions:
        wrongCount, correctCount from quiz_attempt_questions
        joined with quiz_attempts.user_id = auth user.
Step D  Split pool into "fresh" (id not in recentIds) and "recent".
Step E  Score every candidate:
        base = 1
        +0.6 per prior wrong answer (cap +1.8)
        -0.25 per prior correct answer (floor 0.2)
        recent questions get their score * 0.15 (only used if fresh runs out)
Step F  Build target mix from question_count (default 10):
        easy 40%, medium 40%, hard 20% — rounded, remainder filled by medium then any.
Step G  For each difficulty bucket:
          take from fresh first, weighted-random sample without replacement,
          fall back to recent bucket if short,
          fall back to other difficulties if still short.
Step H  Final Fisher–Yates shuffle for display order; shuffle options per question.
```

Response gains: `question_type`, `difficulty`, `metadata` per question. `correct_answer` still never leaves the server.

## 3. `submit-quiz` — record per-question history

After scoring the id-keyed answers, insert one row per answered question into `quiz_attempt_questions` with `was_correct`. Wrap in the same request; failure to log does not fail the submission (logged warning). Continue returning `idResults` unchanged.

## 4. Question-type architecture (no new types yet)

Server side (`start-quiz`): a `serializers` map keyed by `question_type` shapes the public payload. Default `multiple_choice` serializer returns `{ id, question_type, difficulty, prompt, audio_url, options, metadata }`. Adding a new type = add one serializer entry; no engine changes.

Client side: introduce `src/components/quiz/questionTypes/` with:
- `types.ts` — `QuizQuestion` union + `QuestionTypeRenderer` interface `{ Render, isAnswered, getAnswerPayload }`.
- `registry.ts` — `registerQuestionType(type, renderer)` + `getRenderer(type)`.
- `MultipleChoice.tsx` — extracted from current `QuizPage` render block, registered as `multiple_choice`.
- `index.ts` — imports side-effect registers all built-ins.

`QuizPage.tsx` becomes a thin controller: pick renderer by `question.question_type`, delegate rendering + answer capture. Unknown type → friendly "Unsupported question type" fallback (never crashes engine). No behavior change today.

## 5. Admin editor

Minimal additions to existing `AdminQuizQuestions` editor:
- Difficulty select (Easy / Medium / Hard).
- Read-only `question_type` badge (defaults to Multiple Choice) — a select is wired but locked to `multiple_choice` until new types ship.

## 6. Verification

- Migration lint clean.
- Manual: retake a quiz twice on a >10-question pool → Attempt 2 shows disjoint IDs from Attempt 1.
- Manual: mark a question wrong, retake several times → that question reappears more often than a consistently-correct sibling.
- Difficulty mix check on a pool with mixed tags: 10-question quiz returns ~4/4/2.
- Existing quizzes with no difficulty set still work (treated as medium).

## Technical Notes

- `quiz_questions.type` already exists and stores the MCQ variant (e.g., `text`, `audio`). We keep it as-is and add `question_type` as the new engine-level discriminator so we don't break existing rows or admin code. `type` becomes an MCQ subvariant surfaced through `metadata` later if needed.
- `metadata jsonb` is the extensibility hook: audio, image, blanks, ordering tokens all live here so future types need zero schema work.
- Weight formulas are tunable constants in one file (`supabase/functions/start-quiz/weights.ts`) for future A/B.
- Adaptive history is per user per quiz; global cross-quiz adaptation is out of scope.
- No changes to `Intermediate` test engine.
