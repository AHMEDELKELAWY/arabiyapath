

## Plan: Rewrite Free Lesson Upgrade CTA Section

### What changes
**File: `src/pages/learn/LessonPlayer.tsx`** (lines 373-393)

Replace the current weak CTA card with a high-conversion bridge section:

### New section structure

```text
┌──────────────────────────────────────────────┐
│  bg-gradient (primary/10 → secondary/10)     │
│  border-primary/30, rounded-2xl, shadow       │
│                                               │
│  🎉 (party popper emoji or sparkle icon)     │
│                                               │
│  You Just Spoke Your First Gulf Arabic        │
│  Sentence 🎉                                 │
│                                               │
│  Now imagine doing this confidently in real   │
│  conversations.                               │
│                                               │
│  ✓ 150+ step-by-step lessons                 │
│  ✓ Real-life dialogues used in UAE & GCC     │
│  ✓ Structured path from zero to confident    │
│                                               │
│  Don't stop after lesson one.                │
│  Build real speaking confidence.              │
│                                               │
│  [ Continue My Arabic Journey → ]  (xl btn)  │
│                                               │
│  Instant lifetime access.                     │
└──────────────────────────────────────────────┘
```

### Technical details

- Replace lines 373-393 in `LessonPlayer.tsx`
- Keep the `isFreeTrialContent` guard
- Keep the dynamic pricing link logic (`/pricing?course=gulf` or `fusha`)
- Use `variant="hero"` and `size="xl"` on the button for visual weight
- Use `CheckCircle2` icons for benefit bullets, `ArrowRight` for button
- Add `Sparkles` icon from lucide-react near the headline
- Background: `bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10` with `border-primary/30`
- Larger padding (`p-8 sm:p-10`) for premium feel
- Import additions: `CheckCircle2`, `ArrowRight`, `Sparkles` from lucide-react (check which are already imported)

### No other files changed

