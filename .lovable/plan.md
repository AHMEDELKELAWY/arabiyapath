

## Plan: Fix /free-gulf-lesson Lead Capture with Custom UI + Hidden Zoho Form

### Problem
The current form section renders the raw Zoho embed HTML directly, which is visually inconsistent and may not be properly connected. The user wants a clean custom React form that proxies submissions to the hidden Zoho form.

### Approach
Restructure `src/pages/FreeGulfLesson.tsx` form section into two parts:
1. **Visible custom form** — clean React UI with email input, button, validation, loading state
2. **Hidden Zoho form** — the existing embed HTML moved off-screen, used only for submission

### Changes

**File: `src/pages/FreeGulfLesson.tsx`**

1. Add state variables: `email`, `isSubmitting`, `error`, `submitted`
2. Replace the visible form section (lines ~128–373) with:
   - A clean card containing:
     - Title: "Get Your Free Lesson"
     - Subtitle: "Enter your email to start learning Gulf Arabic today."
     - Email input using the project's `<Input>` component
     - Submit button using `<Button>` ("Get My Free Lesson" / "Submitting...")
     - Inline error message
     - Privacy note: "No spam. Unsubscribe anytime."
   - The entire existing Zoho embed HTML moved into a `div` with `className="sr-only"` (visually hidden but in DOM so Zoho script can find it)
3. On custom form submit:
   - Validate email (non-empty, contains @)
   - Set `isSubmitting = true`
   - Find the hidden Zoho input (`EMBED_FORM_EMAIL_LABEL`) and set its value
   - Programmatically click the hidden `#zcWebOptin` button
   - Listen for the Zoho success div (`#Zc_SignupSuccess`) becoming visible via MutationObserver (or poll), then redirect
   - After a timeout (~3s), redirect anyway to `/learn/lesson/d4e5f6a7-0101-0101-0101-000000000001`
   - On failure, show inline error and keep email in input
4. Remove the `showFallback` external link — no longer needed
5. Keep the `useZohoOptin` hook call for script loading and `setupSF` initialization
6. Redirect URL: `/learn/lesson/d4e5f6a7-0101-0101-0101-000000000001` (internal route via `useNavigate`)

**File: `src/hooks/useZohoOptin.ts`** — No changes needed. It already handles script loading and `setupSF` initialization.

### Technical Details

```text
User sees:
┌────────────────────────────┐
│   Get Your Free Lesson     │
│   Enter your email...      │
│                            │
│   [  email@example.com  ]  │
│   [  Get My Free Lesson ]  │
│                            │
│   No spam. Unsubscribe...  │
└────────────────────────────┘

Hidden (sr-only):
┌────────────────────────────┐
│  Zoho embed form HTML      │
│  (CONTACT_EMAIL input)     │
│  (zcWebOptin button)       │
│  (all hidden fields)       │
└────────────────────────────┘

Flow:
1. User types email → custom input
2. Click "Get My Free Lesson"
3. JS sets hidden Zoho CONTACT_EMAIL = email
4. JS clicks hidden #zcWebOptin
5. Zoho processes submission via iframe
6. After short delay → navigate to lesson page
```

- The Zoho form submits to an iframe (`_zcSignup`), so it won't navigate the page
- We redirect after a brief delay since we can't reliably detect Zoho's iframe response
- The `useZohoOptin` hook ensures `setupSF` runs, which attaches Zoho's validation/submission logic to `#zcWebOptin`

### Files Modified
- `src/pages/FreeGulfLesson.tsx` (restructure form section)

