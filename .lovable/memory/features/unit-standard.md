---
name: ArabiyaPath Unit Standard
description: Permanent 4-tab unit template (Learn/Listening/Speaking/Test) — single renderer, kind-based data sources, automatic inheritance for all current and future units
type: feature
---

The "In The Classroom" architecture is the permanent template for every flash card unit.

**Single renderer:** `src/pages/flashcards/FlashCardUnit.tsx` at route `/flashcards/unit/:slug`. No per-unit renderers, no forked layouts.

**Contract module:** `src/components/flashcards/msa/unitTemplate.ts` exports `UNIT_TABS`, `LEARN_KIND`, `SPEAKING_KIND`, `LISTENING_SOURCE_KINDS`, `TEST_SOURCE_KINDS`. All activities import from here.

**Tabs (fixed order):** Learn → Listening → Speaking → Test Yourself.

**Data sources:**
- Learn: `flashcards.kind = 'learn'` (manual authoring)
- Speaking: `flashcards.kind = 'speaking'` (manual authoring)
- Listening: `kind IN ('learn','speaking')` (auto-generated)
- Test Yourself: `kind IN ('learn','speaking')` (auto-generated)

**Authoring rules:**
- Learn = single concept, real image, full tashkeel with final sukoon (`قَلَمْ` not `قَلَمٌ`)
- Speaking = meaningful phrase/sentence, full tashkeel, image matches whole expression
- Listening and Test Yourself need no authoring

**UI inherited automatically:** compact header, Back To Units, sticky tabs, ActivityProgress, mobile-first nav, capped images (250/500px), click-image-to-play-audio, completion screens, minimal footer, keyboard nav, skeletons, safe-area insets.

**Future-proof rule:** Any new unit row gets the full 4-tab experience as soon as Learn and/or Speaking cards exist. No new component, no custom layout permitted.

See `docs/UNIT_STANDARD.md`.
