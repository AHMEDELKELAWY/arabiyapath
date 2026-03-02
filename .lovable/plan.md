

## Plan: Add Meta Pixel Base Code to `index.html`

Install the Facebook/Meta Pixel (ID: `841178368300586`) in `index.html` so it loads on every page. This will make the existing `fbq('track', 'Lead')` calls on the thank-you page actually fire.

### Changes

**`index.html`** — Add the Meta Pixel script block in the `<head>`, below the existing Google Analytics scripts and above the closing `</head>` tag. Includes:
- The standard `fbevents.js` loader
- `fbq('init', '841178368300586')`
- `fbq('track', 'PageView')` for automatic pageview tracking
- The `<noscript>` fallback image pixel

No other files need to change — the `fbq('track', 'Lead')` calls in `ThankYouFreeGulf.tsx` will now work automatically since `fbq` will be globally available.

