## Goal
Restructure the Admin dashboard so content is always managed inside a Course → Level → Unit scope, before Intermediate/Advanced content is added. Student-facing code is not touched.

## Data model (no schema changes needed)
The hierarchy already exists in the DB:
- `flashcard_courses` → `flashcard_course_levels` → `flashcard_units.course_level_id` → `flashcards` (Spoken Arabic path used by Vocabulary/Cards/Grammar/Listening/Speaking)
- `dialects` → `levels` → `units` → `lessons`/`quizzes` (legacy Learn path used by AdminContent)

Both hierarchies stay. Only requirement: every Unit belongs to exactly one Level. We will add a one-time guard in the Units admin to make `course_level_id` (or `level_id`) required going forward. No student-side change.

## New shared admin scope

### 1. `AdminScopeContext` (new)
`src/components/admin/AdminScopeContext.tsx`
- Holds `{ courseId, levelId, unitId, setLevel(levelId), setUnit(unitId) }`.
- Persists to `localStorage` key `admin.scope.v1` so selection survives navigation and reloads.
- Two flavors, one provider file, exposed via `useAdminFlashcardScope()` (for Spoken Arabic / flashcards) and `useAdminLearnScope()` (for legacy dialect/level/unit content). Same shape, different data source, so admin pages stay simple.
- Provider mounted once in `AdminLayout` so every admin page shares the same selection.

### 2. `<AdminScopePicker />` (new)
`src/components/admin/AdminScopePicker.tsx`
- Renders two dropdowns side by side:
  1. **Course / Level** — e.g. "Spoken Arabic – Beginner", "Spoken Arabic – Intermediate". Uses `useFlashcardCourseStructure()` (already exists) for the flashcard scope; uses `useLevels()` grouped by dialect for the Learn scope.
  2. **Unit** — filtered to units whose `course_level_id` / `level_id` matches the selected Level. Beginner units are never shown when Intermediate is selected.
- When Level changes, Unit auto-resets to the first Unit of that Level.
- Sticky bar at the top of every content page so admins never lose context.

## Admin pages to migrate

Replace each page's local "Select Unit" dropdown with `<AdminScopePicker />` + `useAdminFlashcardScope()` / `useAdminLearnScope()`.

Flashcard-side (Spoken Arabic hierarchy):
- `AdminFlashcardUnits.tsx` — already grouped by Course/Level; add Level filter, keep the "Unassigned" bucket only visible when Level = "All".
- `AdminFlashcardCards.tsx` — remove internal unit picker, read `unitId` from scope. Search/filter, Import CSV, Export, Backup, Restore, Bulk Image Upload all operate on `scope.unitId` only.
- Cards Grammar tab (inside `AdminFlashcardCards.tsx`) — same scope.
- `AdminFlashcardDiagnostics.tsx` — scoped by unit.
- `AdminFlashcardPacks.tsx` — packs are cross-unit, keep as-is (packs bundle units, do not belong to a single unit).

Learn-side (legacy dialects/levels/units):
- `AdminContent.tsx` (Units, Lessons, Quizzes tabs) — add the same scope bar. Lessons and Quizzes tabs list only items whose unit is in the selected Level; the Unit selector inside those tabs is replaced by the shared one.

Untouched admin pages (no content scope needed): Users, Purchases, Coupons, Products, Notifications, Email Log, Affiliates, Certificates, Memberships.

## Create-content defaults
When admin creates a Card, Lesson, Grammar note, Quiz, Listening item, etc. from a scoped page, we pre-fill `unit_id` / `course_level_id` from the current scope and hide those fields in the create dialog (still editable via a small "Change scope" link so mis-scoped items can be moved). No prompt, no re-selection.

## Import / Export / Backup / Restore / Bulk Image Upload
All existing buttons stay, but their handlers change from "iterate current filter" to "operate on `scope.unitId`". The scope bar shows a short line like *"Importing into: Spoken Arabic – Beginner / Unit 3 — Greetings"* above the action so mistakes are obvious.

## Search
Search inputs in `AdminFlashcardCards`, Lessons tab, Quizzes tab, Grammar tab filter within `scope.unitId` only. Cross-unit search is removed for now (out of scope).

## Guard against unassigned units
`AdminFlashcardUnits` and Learn `UnitsTab` will require a Level selection when creating a new unit (already true for Learn, needs enforcement for flashcard units — the "Unassigned" option in the create form will be removed; existing unassigned rows keep working and show a warning badge).

## Explicitly not changed
Student dashboard, learning flow, progress, flashcards runtime, quiz logic, membership, payments, emails, auth, routing, SEO, DB schema, RLS.

## Technical file list
New:
- `src/components/admin/AdminScopeContext.tsx`
- `src/components/admin/AdminScopePicker.tsx`

Edited:
- `src/components/admin/AdminLayout.tsx` (mount provider + optional sticky picker slot)
- `src/pages/admin/AdminFlashcardUnits.tsx`
- `src/pages/admin/AdminFlashcardCards.tsx`
- `src/pages/admin/AdminFlashcardDiagnostics.tsx`
- `src/pages/admin/AdminContent.tsx`
- `src/components/admin/content/UnitsTab.tsx`
- `src/components/admin/content/LessonsTab.tsx`
- `src/components/admin/content/QuizzesTab.tsx`

No DB migration. No student code changes.