// Helper for partner-landing coupon persistence.
// The coupon is the SOLE attribution mechanism — we just stash the code in
// sessionStorage so the existing checkout flow auto-applies it later.

const KEY = "ap_partner_coupon";

export function setPartnerCoupon(code: string) {
  if (!code) return;
  try {
    sessionStorage.setItem(KEY, code.toUpperCase());
  } catch {
    /* sessionStorage unavailable — silently ignore */
  }
}

export function getPartnerCoupon(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPartnerCoupon() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
