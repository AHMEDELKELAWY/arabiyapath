# ArabiyaPath Unit Standard

The permanent template for every flash-card unit on the platform.
"In The Classroom" is the official blueprint — all current and future units
inherit the same renderer, data model, admin workflow, and learner UX.

## One renderer, one route

- Route: `/flashcards/unit/:slug`
- Component: `src/pages/flashcards/FlashCardUnit.tsx`
- Contract: `src/components/flashcards/msa/unitTemplate.ts`

No per-unit renderers. No forked layouts. No alternate activity flows.

## Tabs (fixed order)

1. **Learn** — vocabulary acquisition
2. **Listening** — audio → image comprehension
3. **Speaking** — speak + pronunciation score
4. **Test Yourself** — 10-question mixed assessment

## Data sources

| Tab           | Source                              |
| ------------- | ----------------------------------- |
| Learn         | `flashcards.kind = 'learn'`         |
| Speaking      | `flashcards.kind = 'speaking'`      |
| Listening     | `flashcards.kind IN ('learn','speaking')` |
| Test Yourself | `flashcards.kind IN ('learn','speaking')` |

Listening and Test Yourself are **auto-generated** — no separate authoring.

## Content authoring rules

### Learn cards
- One concept per card.
- Real photographic image (no text baked in).
- Full tashkeel with **final sukoon** style: `قَلَمْ`, `فَوْقْ`, `كِتَابْ` — not `قَلَمٌ`, `فَوْقَ`, `كِتَابٍ`.
- Includes: image, Arabic, transliteration, English, audio.

### Speaking cards
- Full meaningful phrase or sentence.
- Full tashkeel, final sukoon style.
- Image matches the entire expression.
- Includes: image, Arabic sentence, English, audio.

## UI inheritance (automatic)

Every unit gets, with no per-unit configuration:

- Compact header with Back To Units
- Sticky tab bar
- Shared `ActivityProgress` component
- Mobile-first navigation (Next is the primary full-width action)
- Capped hero images (≤ 250px mobile / 500px desktop)
- Click image to play audio
- Completion screens
- Minimal footer on `/flashcards/unit/:slug`
- Keyboard navigation (← / → / Enter)
- Loading skeletons
- `env(safe-area-inset-*)` support

## Future units

Creating a new row in `flashcard_units` is enough. As soon as Learn and/or
Speaking cards exist for that unit, the full 4-tab experience is live.

No code changes. No new components. No alternate flows allowed.
