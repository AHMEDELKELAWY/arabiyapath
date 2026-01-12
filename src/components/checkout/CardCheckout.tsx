import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PayPalScriptProvider,
  PayPalCardFieldsProvider,
  PayPalCardFieldsForm,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CardCheckoutProps {
  productType: string;
  productName: string;
  price: number;
  clientToken: string;
  couponCode?: string;
  onSuccess?: () => void;
}

interface SubmitPaymentButtonProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  price: number;
}

function SubmitPaymentButton({ isLoading, setIsLoading, price }: SubmitPaymentButtonProps) {
  const { cardFieldsForm } = usePayPalCardFields();

  const handleClick = async () => {
    if (!cardFieldsForm) {
      toast.error("Card fields not loaded");
      return;
    }

    const formState = await cardFieldsForm.getState();
    
    if (!formState.isFormValid) {
      toast.error("Please fill in all card details correctly");
      return;
    }

    setIsLoading(true);
    
    try {
      await cardFieldsForm.submit();
    } catch (error) {
      console.error("Card submission error:", error);
      toast.error("Payment failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full gap-2"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Processing Payment...
        </>
      ) : (
        <>
          <Lock className="h-4 w-4" />
          Pay ${price.toFixed(2)}
        </>
      )}
    </Button>
  );
}

export function CardCheckout({
  productType,
  productName,
  price,
  clientToken,
  couponCode,
  onSuccess,
}: CardCheckoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const createOrder = async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/login");
      throw new Error("Not authenticated");
    }

    const { data: session } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({
          productType,
          couponCode,
          paymentSource: "card",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create order");
    }

    return data.orderId;
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-capture-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            orderId: data.orderID,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment capture failed");
      }

      toast.success("Payment successful! Enjoy your course.");
      await queryClient.invalidateQueries({ queryKey: ["purchases", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["dialects-full"] });
      onSuccess?.();
      navigate("/dashboard");
    } catch (error) {
      console.error("Capture error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsLoading(false);
    }
  };

  const onError = (error: Record<string, unknown>) => {
    console.error("PayPal Card Fields error:", error);
    toast.error("Payment failed. Please try again.");
    setIsLoading(false);
  };

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  if (!paypalClientId) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Card payments are not configured
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <CreditCard className="h-4 w-4" />
        <span>Secure card payment</span>
      </div>

      <PayPalScriptProvider
        options={{
          clientId: paypalClientId,
          components: "card-fields",
          dataClientToken: clientToken,
          intent: "capture",
        }}
      >
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          style={{
            input: {
              "font-size": "16px",
              "font-family": "inherit",
              padding: "12px",
            },
            ".invalid": {
              color: "red",
            },
          }}
        >
          <PayPalCardFieldsForm />
          
          <div className="mt-4">
            <SubmitPaymentButton
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              price={price}
            />
          </div>
        </PayPalCardFieldsProvider>
      </PayPalScriptProvider>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Your payment info is encrypted and secure</span>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <img src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png" alt="PayPal" className="h-5 opacity-60" />
        <div className="flex gap-1">
          {["visa", "mastercard", "amex", "discover"].map((card) => (
            <div
              key={card}
              className="w-8 h-5 bg-muted rounded flex items-center justify-center"
            >
              <span className="text-[8px] uppercase font-bold text-muted-foreground">
                {card.slice(0, 4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
