// Google Analytics 4 Tracking Utilities
// Measurement ID: G-3DJ1C5CKBK

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = 'G-3DJ1C5CKBK';

// Track page views (for SPA routing)
export const trackPageView = (url: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// Track book_trial conversion event
export const trackBookTrial = (ctaText: string, ctaLocation: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'book_trial', {
      event_category: 'conversion',
      page_path: window.location.pathname,
      cta_text: ctaText,
      cta_location: ctaLocation,
    });
  }
};

// Track generate_lead conversion event
export const trackGenerateLead = (formName: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'generate_lead', {
      event_category: 'conversion',
      form_name: formName,
      page_path: window.location.pathname,
    });
  }
};

// Track outbound_click event
export const trackOutboundClick = (destination: string, linkText: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'outbound_click', {
      event_category: 'engagement',
      destination: destination,
      link_text: linkText,
      page_path: window.location.pathname,
    });
  }
};

// Generic event tracking
export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, {
      ...params,
      page_path: window.location.pathname,
    });
  }
};

// Temporary GA4 debug mode: verbose console logging of purchase payloads.
// Enable/disable with localStorage key `ga4_debug` ("0" to silence). On by default.
const ga4DebugEnabled = () => {
  try {
    return localStorage.getItem('ga4_debug') !== '0';
  } catch {
    return true;
  }
};

// Track a verified purchase (GA4 ecommerce). Deduped per transaction id so a
// page refresh never fires the event twice.
export const trackPurchase = (params: {
  transactionId: string;
  value: number;
  currency?: string;
  productType?: string;
  items?: Array<Record<string, unknown>>;
}) => {
  if (!params.transactionId) {
    console.warn('[GA4 DEBUG] purchase skipped — missing transaction_id', params);
    return;
  }
  const key = `ga4_purchase_${params.transactionId}`;
  try {
    if (localStorage.getItem(key)) {
      if (ga4DebugEnabled()) {
        console.warn('[GA4 DEBUG] purchase deduped (already sent)', params.transactionId);
      }
      return;
    }
  } catch {
    /* storage unavailable — still fire once per page load */
  }

  const payload = {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency || 'USD',
    product_type: params.productType,
    items: params.items ?? [],
  };

  if (ga4DebugEnabled()) {
    console.groupCollapsed('%c[GA4 DEBUG] gtag("event","purchase")', 'color:#2f6b58;font-weight:bold');
    console.log('transaction_id:', payload.transaction_id);
    console.log('value:', payload.value, 'currency:', payload.currency);
    console.log('product_type:', payload.product_type);
    console.log('items:', payload.items);
    console.table(payload.items);
    console.log('full payload:', payload);
    const required = ['transaction_id', 'currency', 'value', 'product_type'];
    const missingTop = required.filter((k) => (payload as Record<string, unknown>)[k] == null);
    const itemRequired = ['item_id', 'item_name', 'product_type'];
    const missingItem = (payload.items as Array<Record<string, unknown>>).flatMap((it, i) =>
      itemRequired.filter((k) => it[k] == null).map((k) => `items[${i}].${k}`)
    );
    const missing = [...missingTop, ...missingItem];
    console.log(missing.length ? `❌ missing fields: ${missing.join(', ')}` : '✅ payload complete');
    console.log('gtag loaded:', typeof window.gtag !== 'undefined');
    console.groupEnd();
  }

  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'purchase', payload);
  } else {
    console.warn('[GA4 DEBUG] purchase skipped — gtag not loaded', params.transactionId);
  }

  if (typeof (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq !== 'undefined') {
    (window as unknown as { fbq: (...a: unknown[]) => void }).fbq('track', 'Purchase', {
      value: params.value,
      currency: params.currency || 'USD',
    });
  }

  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }
};
