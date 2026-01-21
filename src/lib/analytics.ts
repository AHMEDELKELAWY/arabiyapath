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
