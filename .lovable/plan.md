

## Plan: Implement Default Layout and Focus Layout

### Overview
Create a new `FocusLayout` component (minimal nav, no footer, no chatbot button) and apply it to all high-conversion flow pages. The existing `Layout` remains unchanged for regular pages.

### New File: `src/components/layout/FocusLayout.tsx`

A minimal layout component that:
- Renders a simplified top bar with only the logo (links to `/`) and a single "Dashboard" or "Log in" link on the right
- No full Navbar, no Footer, no floating AI Advisor button
- No dropdown menus, no blog/pricing/flash cards links
- Clean `min-h-screen flex flex-col` structure with `pt-16` main area
- The top bar uses the same `glass` fixed header styling as the Navbar for consistency

```text
┌─────────────────────────────────────────┐
│  [Logo ArabiyaPath]          [Log in]   │  ← minimal top bar
├─────────────────────────────────────────┤
│                                         │
│           Page Content                  │  ← children
│                                         │
└─────────────────────────────────────────┘
                                             ← no footer
```

### Files Modified

**`src/pages/learn/LessonPlayer.tsx`** — Change `import { Layout }` to `import { FocusLayout }` and replace `<Layout>` / `</Layout>` with `<FocusLayout>` / `</FocusLayout>`

**`src/pages/learn/QuizPage.tsx`** — Same swap: `Layout` → `FocusLayout`

**`src/pages/Checkout.tsx`** — Same swap: `Layout` → `FocusLayout`

**`src/pages/FreeGulfLesson.tsx`** — Same swap: `Layout` → `FocusLayout`

**`src/pages/PaymentSuccess.tsx`** — Same swap (post-payment confirmation should stay focused)

**`src/pages/PaymentCancel.tsx`** — Same swap

### Technical Details

- `FocusLayout` does NOT call `useChatbaseInit()` or render the floating chatbot button — zero distractions
- The minimal top bar shows:
  - Left: Logo + "ArabiyaPath" (links to `/`)
  - Right: If authenticated → "Dashboard" link + small "Log out" button; if not → "Log in" text link
  - Uses `useAuth()` for auth state
- Mobile: same minimal bar, no hamburger menu needed (only logo + auth link)
- No new dependencies required

### Pages NOT changed (stay on default Layout)
- Index, Pricing, Blog, Dialects, FAQ, Contact, About, Dashboard, Flash Cards, etc. — all keep the full `Layout` with footer

