// Helper for partner-landing coupon persistence.
// The coupon is the SOLE attribution mechanism — we just stash the code in
// localStorage so the existing checkout flow auto-applies it later, and so
// it survives page refreshes, sign-in redirects, and account creation.

const KEY = "ap_partner_coupon";

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

export function setPartnerCoupon(code: string) {
  if (!code) return;
  const value = normalize(code);
  if (!value) return;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage unavailable — silently ignore */
  }
  // Mirror to sessionStorage for backwards compatibility with any older readers.
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    /* noop */
  }
}

export function getPartnerCoupon(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return normalize(v);
  } catch {
    /* fall through */
  }
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? normalize(v) : null;
  } catch {
    return null;
  }
}

export function clearPartnerCoupon() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
