

## Plan: Upgrade FocusLayout to a Closed Funnel Structure

### Overview
Transform the existing `FocusLayout` into a strict closed-funnel layout that eliminates all exit paths. The logo becomes non-navigational (or context-aware back link), all external links are removed, and the layout creates a sealed conversion environment.

### Changes

#### 1. Rewrite `src/components/layout/FocusLayout.tsx`

Update the component to accept an optional `backTo` prop for contextual back-navigation on the logo:

- **Logo**: Renders as a static element by default (no link). When `backTo` is provided, the logo links to that specific funnel step only.
- **Remove** the Dashboard link, Log in link, and Log out button entirely.
- **Remove** the `useAuth` import — no auth UI in the funnel.
- **Header**: Keep the minimal `glass` fixed bar with logo only, right side empty.
- **No footer, no chatbot.**

```text
interface FocusLayoutProps {
  children: ReactNode;
  backTo?: string;  // optional: where the logo links (previous funnel step)
}
```

```text
┌─────────────────────────────────────────┐
│  [Logo ArabiyaPath]                     │  ← logo only, no links on right
├─────────────────────────────────────────┤
│           Page Content                  │
└─────────────────────────────────────────┘
```

#### 2. Update `src/pages/learn/LessonPlayer.tsx`

- Pass `backTo={/learn/unit/${data?.unit?.id}}` to `FocusLayout` so the logo navigates back to the current unit (previous funnel step), not home.
- In the upgrade CTA section (lines 406-416): change the Link destination from `/pricing?course=...` to `/checkout?dialectId=...` to skip the open pricing page and go straight to checkout (keeping the funnel closed). This requires the dialect ID from the existing `data.dialect` object.

#### 3. Update `src/pages/learn/QuizPage.tsx`

- Pass `backTo={/learn/unit/${unit?.id}}` to all `FocusLayout` instances.

#### 4. Update `src/pages/Checkout.tsx`

- Pass `backTo` pointing back to pricing or the previous lesson context. Since checkout can come from multiple entry points, use a simple back: `backTo={searchParams.get("from") || undefined}` — or omit it so the logo is static (no escape from checkout).
- Remove the "Back" button (lines 194-201) that currently uses `navigate(-1)` — this is an exit path.
- The page already has no competing CTAs beyond the PayPal checkout, which is correct.

#### 5. Update `src/pages/PaymentSuccess.tsx`

- Use `FocusLayout` with no `backTo` (logo is static).
- The existing CTA buttons ("Start Learning", "Go to Dashboard") are appropriate post-purchase — keep them as the single path forward.

#### 6. Update `src/pages/PaymentCancel.tsx`

- Use `FocusLayout` with no `backTo`.
- Replace current buttons: remove "Go Home" link. Keep only a single "Try Again" button that navigates back to checkout (use `navigate(-1)` or a stored checkout URL).

#### 7. Update `src/pages/FreeGulfLesson.tsx`

- Use `FocusLayout` with no `backTo` (logo is static — this is a landing page, no escape).

### Technical Details

- The `backTo` prop controls whether the logo is a `Link` or a plain `div`. When undefined, logo is static (maximum funnel lock).
- No new dependencies needed.
- No database changes.
- All pages already use `FocusLayout` — this is purely a prop/behavior update to the shared component and minor per-page adjustments.

### Files changed
- `src/components/layout/FocusLayout.tsx` — rewrite header to logo-only, add `backTo` prop
- `src/pages/learn/LessonPlayer.tsx` — pass `backTo` prop, update upgrade CTA link
- `src/pages/learn/QuizPage.tsx` — pass `backTo` prop
- `src/pages/Checkout.tsx` — remove back button, static logo
- `src/pages/PaymentSuccess.tsx` — no `backTo` (static logo)
- `src/pages/PaymentCancel.tsx` — remove "Go Home", single retry CTA
- `src/pages/FreeGulfLesson.tsx` — no `backTo` (static logo)

