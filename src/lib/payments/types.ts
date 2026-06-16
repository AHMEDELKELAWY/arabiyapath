// Payment provider abstraction layer.
// Default: PayPal. Stripe and others can be added without DB changes.

export type ProviderCode = "paypal" | "stripe" | "paddle";

export interface CreateOrderInput {
  productId: string;       // products.id (existing table)
  couponCode?: string;
}

export interface CreateOrderResult {
  orderId?: string;
  pendingOrderId?: string;
  approvalUrl?: string;
  freeAccess?: boolean;
}

export interface CaptureOrderInput {
  orderId: string;
  pendingOrderId?: string;
}

export interface CaptureOrderResult {
  success: boolean;
  purchaseId?: string;
}

export interface PaymentProvider {
  readonly code: ProviderCode;
  readonly displayName: string;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  captureOrder(input: CaptureOrderInput): Promise<CaptureOrderResult>;
}
