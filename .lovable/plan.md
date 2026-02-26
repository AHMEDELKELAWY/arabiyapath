

## Plan: Rewrite /free-gulf-lesson as a Conversion-Focused Landing Page

### Overview
Complete rewrite of `src/pages/FreeGulfLesson.tsx` with 6 conversion-optimized sections, preserving the existing Zoho Campaigns integration (hidden form + `useZohoOptin` hook) and redirect logic.

### File Changed
- `src/pages/FreeGulfLesson.tsx` (full rewrite)

### Section Breakdown

**Section 1 — Hero**
- Headline: "Speak Gulf Arabic in 10 Minutes — Even If You're a Complete Beginner"
- Subheadline: "Learn real phrases people actually use in the UAE & GCC — not textbook Arabic."
- 3 benefit bullets with check icons
- CTA button: "Get My Free Lesson" (scrolls to final form)
- Trust line: "Free. Instant access. No spam."
- Background decorative blurs (existing pattern)

**Section 2 — The Problem**
- Headline: "Why Most Arabic Courses Don't Work for Expats"
- 3 punchy problem bullets with X icons
- Closing line: "This lesson fixes that." (bold/highlighted)

**Section 3 — What You'll Experience**
- Headline: "Inside This Free Lesson"
- 4 benefit bullets with relevant icons (MessageCircle, Coffee, Headphones, Repeat)

**Section 4 — Future Vision**
- Headline: "Imagine This..."
- Short evocative paragraph as provided
- Closing: "This is your first step." (bold)

**Section 5 — Who It's For**
- 3 qualifier bullets with check icons
- Alternating background (`bg-cream`)

**Section 6 — Final CTA**
- Headline: "Ready to Say Your First Sentence in Arabic?"
- Email form (same Zoho proxy pattern)
- Button: "Unlock My Free Lesson"
- Success state: brief "You're in!" message before redirect
- Trust note: "Free. Instant access. No spam."

### Technical Details

- Reuse existing constants: `ZOHO_FORM_ID`, `ZOHO_SCRIPT_SRC`, `REDIRECT_URL`
- Keep `useZohoOptin` hook call unchanged
- Keep hidden Zoho form HTML block unchanged (lines 205-254)
- Keep `handleSubmit` logic unchanged (set hidden input, click hidden button, redirect after 2.5s)
- Add `submitted` state to show brief success message before redirect
- Hero CTA scrolls to `formRef` (Section 6)
- Use existing UI components: `Button`, `Input`, `Layout`, `SEOHead`
- Icons from lucide-react: `CheckCircle2`, `X`, `Mail`, `ArrowRight`, `Headphones`, `MessageCircle`, `Coffee`, `Repeat`

### No Other Files Changed
- `useZohoOptin.ts` — no changes
- No database changes
- No new dependencies

