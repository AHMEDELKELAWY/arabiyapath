import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Tag, CheckCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CardCheckout } from "./CardCheckout";
import { getPartnerCoupon } from "@/lib/partnerCoupon";

interface PayPalCheckoutProps {
  productType: string;
  productName: string;
  price: number;
  successRedirectPath?: string;
  onSuccess?: () => void;
}

export function PayPalCheckout({ productType, productName, price, successRedirectPath, onSuccess }: PayPalCheckoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [activeTab, setActiveTab] = useState("card");

  // Floor (not round) to 2 decimals so 29.99 * 0.5 = 14.995 displays as $14.99,
  // never as $15.00. Server-side computes the authoritative charge amount.
  const finalPrice = appliedCoupon
    ? Math.floor(price * (1 - appliedCoupon.discount / 100) * 100) / 100
    : price;

  // Fetch client token for card payments
  useEffect(() => {
    const fetchClientToken = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          console.error("No active session for PayPal client token");
          setIsLoadingToken(false);
          return;
        }
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-client-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );


        const data = await response.json();

        if (response.ok && data.clientToken) {
          setClientToken(data.clientToken);
        } else {
          console.error("Failed to fetch client token:", data.error);
        }
      } catch (error) {
        console.error("Error fetching client token:", error);
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchClientToken();
  }, []);

  // Auto-apply a coupon stored from a Partner landing page (sessionStorage).
  // Re-uses the existing coupon attribution flow — no new tracking system.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current || appliedCoupon) return;
    const stored = getPartnerCoupon();
    if (!stored) return;
    autoAppliedRef.current = true;
    (async () => {
      setIsApplyingCoupon(true);
      try {
        const { data: coupons } = await supabase.rpc("lookup_coupon", { _code: stored });
        const coupon = Array.isArray(coupons) ? coupons[0] : coupons;
        if (!coupon) return;
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return;
        setCouponCode(coupon.code);
        setAppliedCoupon({
          code: coupon.code,
          discount: coupon.percent_off || coupon.discount_percent || 0,
        });
        toast.success(`Partner discount applied: ${coupon.code}`);
      } catch {
        /* silent — user can apply manually */
      } finally {
        setIsApplyingCoupon(false);
      }
    })();
  }, [appliedCoupon]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      const { data: coupons, error } = await supabase
        .rpc("lookup_coupon", { _code: couponCode.toUpperCase() });
      const coupon = Array.isArray(coupons) ? coupons[0] : coupons;

      if (error || !coupon) {
        toast.error("Invalid or expired coupon code");
        return;
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error("This coupon has expired");
        return;
      }


      setAppliedCoupon({ code: coupon.code, discount: coupon.percent_off || coupon.discount_percent || 0 });
      toast.success(`Coupon applied! ${coupon.percent_off || coupon.discount_percent}% off`);
    } catch (error) {
      toast.error("Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handlePayPalCheckout = async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
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
            couponCode: appliedCoupon?.code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      // Check if it was a free order (100% coupon)
      if (data.freeAccess) {
        toast.success("Access granted! Enjoy your course.");
        await queryClient.invalidateQueries({ queryKey: ["purchases", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["user-purchases", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["dialects-full"] });
        await queryClient.invalidateQueries({ queryKey: ["fc-dashboard"] });
        await queryClient.invalidateQueries({ queryKey: ["fc-resume-slug"] });
        await queryClient.invalidateQueries({ queryKey: ["fc-unit-access"] });
        onSuccess?.();
        navigate(data.productType === "flashcard_pack" ? "/flashcards" : successRedirectPath ?? "/dashboard");
        return;
      }

      // Redirect to PayPal
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error("No approval URL received from PayPal");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeAccess = async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
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
            couponCode: appliedCoupon?.code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process");
      }

      if (data.freeAccess) {
        toast.success("Access granted! Enjoy your course.");
        await queryClient.invalidateQueries({ queryKey: ["purchases", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["user-purchases", user?.id] });
        await queryClient.invalidateQueries({ queryKey: ["dialects-full"] });
        await queryClient.invalidateQueries({ queryKey: ["fc-dashboard"] });
        await queryClient.invalidateQueries({ queryKey: ["fc-resume-slug"] });
        await queryClient.invalidateQueries({ queryKey: ["fc-unit-access"] });
        onSuccess?.();
        navigate(data.productType === "flashcard_pack" ? "/flashcards" : successRedirectPath ?? "/dashboard");
      }
    } catch (error) {
      console.error("Free access error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to grant access");
    } finally {
      setIsLoading(false);
    }
  };

  // If 100% discount, show simplified UI
  if (finalPrice === 0) {
    return (
      <div className="space-y-4">
        {/* Coupon Input */}
        <div className="space-y-2">
          <Label htmlFor="coupon" className="text-sm">Have a coupon?</Label>
          <div className="flex gap-2">
            <Input
              id="coupon"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={!!appliedCoupon || isApplyingCoupon}
              className="flex-1"
            />
            {appliedCoupon ? (
              <Button
                type="button"
                variant="outline"
                onClick={removeCoupon}
                size="sm"
              >
                Remove
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={applyCoupon}
                disabled={isApplyingCoupon || !couponCode.trim()}
                size="sm"
              >
                {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            )}
          </div>
          {appliedCoupon && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>{appliedCoupon.code} - {appliedCoupon.discount}% off applied!</span>
            </div>
          )}
        </div>

        {/* Price Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{productName}</span>
            <span className="line-through text-muted-foreground">${price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Discount ({appliedCoupon?.discount}%)
            </span>
            <span>-${price.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-lg text-green-600">FREE</span>
          </div>
        </div>

        <Button
          onClick={handleFreeAccess}
          disabled={isLoading}
          className="w-full gap-2"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            "Get Free Access"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Coupon Input */}
      <div className="space-y-2">
        <Label htmlFor="coupon" className="text-sm">Have a coupon?</Label>
        <div className="flex gap-2">
          <Input
            id="coupon"
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            disabled={!!appliedCoupon || isApplyingCoupon}
            className="flex-1"
          />
          {appliedCoupon ? (
            <Button
              type="button"
              variant="outline"
              onClick={removeCoupon}
              size="sm"
            >
              Remove
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={applyCoupon}
              disabled={isApplyingCoupon || !couponCode.trim()}
              size="sm"
            >
              {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </Button>
          )}
        </div>
        {appliedCoupon && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>{appliedCoupon.code} - {appliedCoupon.discount}% off applied!</span>
          </div>
        )}
      </div>

      {/* Price Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{productName}</span>
          <span className={appliedCoupon ? "line-through text-muted-foreground" : ""}>
            ${price.toFixed(2)}
          </span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Discount ({appliedCoupon.discount}%)
            </span>
            <span>-${(price - finalPrice).toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-lg">${finalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Method Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Card
          </TabsTrigger>
          <TabsTrigger value="paypal" className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.768.768 0 0 1 .757-.65h6.96c2.303 0 4.002.517 5.054 1.538.944.916 1.332 2.17 1.172 3.727-.013.124-.027.249-.044.374-.42 2.86-2.028 4.838-4.668 5.74-.636.217-1.32.368-2.043.452l1.07 6.436a.641.641 0 0 1-.632.74h-4.53a.425.425 0 0 1-.42-.36l-.544-3.28z"/>
            </svg>
            PayPal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-4">
          {isLoadingToken ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading payment form...</p>
            </div>
          ) : clientToken ? (
            <CardCheckout
              productType={productType}
              productName={productName}
              price={finalPrice}
              clientToken={clientToken}
              couponCode={appliedCoupon?.code}
              successRedirectPath={successRedirectPath}
              onSuccess={onSuccess}
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Card payments are temporarily unavailable. Please use PayPal.
              </p>
              <Button variant="outline" onClick={() => setActiveTab("paypal")}>
                Use PayPal Instead
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paypal" className="mt-4">
          <Button
            onClick={handlePayPalCheckout}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.768.768 0 0 1 .757-.65h6.96c2.303 0 4.002.517 5.054 1.538.944.916 1.332 2.17 1.172 3.727-.013.124-.027.249-.044.374-.42 2.86-2.028 4.838-4.668 5.74-.636.217-1.32.368-2.043.452l1.07 6.436a.641.641 0 0 1-.632.74h-4.53a.425.425 0 0 1-.42-.36l-.544-3.28z"/>
                </svg>
                Pay with PayPal
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            You will be redirected to PayPal to complete your payment.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
