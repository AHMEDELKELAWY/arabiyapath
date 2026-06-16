import { supabase } from "@/integrations/supabase/client";
import type {
  PaymentProvider,
  CreateOrderInput,
  CreateOrderResult,
  CaptureOrderInput,
  CaptureOrderResult,
} from "./types";

export const paypalProvider: PaymentProvider = {
  code: "paypal",
  displayName: "PayPal",

  async createOrder({ productId, couponCode }: CreateOrderInput): Promise<CreateOrderResult> {
    const { data, error } = await supabase.functions.invoke("paypal-create-order", {
      body: { productType: productId, couponCode },
    });
    if (error) throw error;
    return {
      orderId: data?.orderId,
      pendingOrderId: data?.pendingOrderId,
      approvalUrl: data?.approvalUrl,
      freeAccess: data?.freeAccess,
    };
  },

  async captureOrder({ orderId, pendingOrderId }: CaptureOrderInput): Promise<CaptureOrderResult> {
    const { data, error } = await supabase.functions.invoke("paypal-capture-order", {
      body: { orderId, pendingOrderId },
    });
    if (error) throw error;
    return { success: !!data?.success, purchaseId: data?.purchaseId };
  },
};
