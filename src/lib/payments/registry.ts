import { paypalProvider } from "./paypal";
import type { PaymentProvider, ProviderCode } from "./types";

const REGISTRY: Partial<Record<ProviderCode, PaymentProvider>> = {
  paypal: paypalProvider,
  // stripe: stripeProvider,   // future
  // paddle: paddleProvider,   // future
};

export const DEFAULT_PROVIDER: ProviderCode = "paypal";

export function getPaymentProvider(code: ProviderCode = DEFAULT_PROVIDER): PaymentProvider {
  const provider = REGISTRY[code];
  if (!provider) throw new Error(`Payment provider not registered: ${code}`);
  return provider;
}

export function listAvailableProviders(): PaymentProvider[] {
  return Object.values(REGISTRY).filter(Boolean) as PaymentProvider[];
}
