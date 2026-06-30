## Goal
Replace the current `/partner/:slug` landing page with the uploaded HTML design (cream + forest + gold, Fraunces/Work Sans/Reem Kufi). Replace the hero flashcard illustration with the YouTube Short `https://youtube.com/shorts/BHeV5AZcb7k`. Keep all backend logic (coupons, partner attribution, PayPal, auth, redirects) untouched.

## Approach
Rewrite `src/pages/PartnerLanding.tsx` as a single self-contained page that mirrors the uploaded HTML structure 1:1, while pulling dynamic values from the existing `buildPartnerConfig` (partner name, coupon %, prices, CTA href).

### Sections (in order, matching the HTML)
1. Urgency strip — "exclusive to {partnerName}'s students … {percent}% Off Flashcards"
2. Sticky header — logo + "Private invitation" pill (reuses `PartnerShell`)
3. Hero (2-col): left = eyebrow badge, H1 with gold italic accent, lead, old/new price, CTA → `ctaHref`, trust row (lifetime, audio, certificate, guarantee). Right = **YouTube Short embed** in a rounded card (replacing the flip-card + floating chips). Embed via `https://www.youtube.com/embed/BHeV5AZcb7k?rel=0` in a 9:16 responsive iframe wrapper so the Short displays natively, with a subtle gold glow frame.
4. Stats bar — 4 numbers from `config.stats`
5. Modes grid (4 cards) — driven by `config.modeCards`
6. "Why students keep coming back" — 3 cards (forest-deep bg)
7. Testimonials — 3 cards
8. Offer recap box (id="offer") — left bullets, middle price, right dashed seal, CTA → `ctaHref`
9. FAQ accordion — `config.faq` (vanilla details/summary or a small useState toggle)
10. Final gold CTA banner → `ctaHref`
11. Minimal footer
12. Mobile sticky bottom CTA (price + button → `ctaHref`)

### Styling
- Inline the uploaded CSS inside a single `<style>` block scoped via a wrapper class `partner-houria` to avoid global bleed (e.g. all selectors prefixed). Fonts loaded via `@fontsource` packages: `@fontsource/fraunces`, `@fontsource/work-sans`, `@fontsource/reem-kufi`, imported in `src/main.tsx`. No Tailwind theme changes.
- Keep `prefers-reduced-motion` rules from the HTML.

### Dynamic substitutions
| HTML literal | Dynamic source |
|---|---|
| "Houria's students" | `config.partnerName` |
| "50% Off" | `config.discountPercent` |
| `$14.99` / `$29.99` | `formatPrice(config.newPrice/oldPrice)` |
| All `href="#offer"` for primary CTAs that aren't on-page anchors | `ctaHref` (existing signup→checkout flow) |
| "3,000+ cards", testimonials, FAQ text | kept verbatim from HTML (static copy) |

The in-page `#offer` anchor link inside the hero stays as `#offer` (jumps to recap), but every actual purchase button uses `ctaHref` (`<Link to={ctaHref}>`).

### Files
- **Rewrite** `src/pages/PartnerLanding.tsx` — single file containing the new markup, scoped `<style>` block, FAQ toggle state, YouTube iframe.
- **Edit** `src/main.tsx` — add three `@fontsource` imports.
- **Install** `@fontsource/fraunces @fontsource/work-sans @fontsource/reem-kufi` via `bun add`.
- **Delete** unused partner components (`PartnerHero`, `StatsSection`, `VideoSection`, `BenefitsSection`, `PlatformShowcase`, `HowItWorks`, `PartnerCertificate`, `PricingSection`, `PartnerFAQ`, `FinalCTA`, `BackToTopButton`, `ProductMockup`) and their `/public/partner/*.png` assets — no longer referenced.
- **Keep untouched**: `PartnerShell`, `partnerConfig.ts`, `partnerCoupon.ts`, `PayPalCheckout`, `Checkout`, `PaymentSuccess`, all DB/RPC code.

### Verification
- `tsgo` typecheck
- Visit `/partner/houria` via Playwright, screenshot desktop (1280) and mobile (390) — confirm YouTube iframe loads, CTAs route to `ctaHref`, urgency strip shows partner name + percent.
