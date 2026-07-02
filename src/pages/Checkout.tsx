import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PayPalCheckout } from "@/components/checkout/PayPalCheckout";
import {
  ArrowLeft,
  Shield,
  Clock,
  Award,
  CheckCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const levelId = searchParams.get("levelId");
  const dialectId = searchParams.get("dialectId");
  const productId = searchParams.get("productId");

  const { data: product, isLoading } = useQuery({
    queryKey: ["checkout-product", levelId, dialectId, productId],
    queryFn: async () => {
      let query = supabase.from("products").select(`
        id,
        name,
        description,
        price,
        scope,
        dialect_id,
        level_id,
        dialects (name),
        levels (name, order_index)
      `);

      if (productId) {
        query = query.eq("id", productId);
      } else if (levelId) {
        query = query.eq("level_id", levelId).eq("scope", "level");
      } else if (dialectId) {
        query = query.eq("dialect_id", dialectId).eq("scope", "bundle");
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(levelId || dialectId || productId),
  });

  const { data: levelInfo } = useQuery({
    queryKey: ["level-info", levelId],
    queryFn: async () => {
      if (!levelId) return null;
      const { data, error } = await supabase
        .from("levels")
        .select(`
          id,
          name,
          order_index,
          dialects (name),
          units (id, title)
        `)
        .eq("id", levelId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!levelId,
  });

  if (!user) {
    const currentUrl = window.location.pathname + window.location.search;
    navigate(`/signup?redirect=${encodeURIComponent(currentUrl)}`, { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <FocusLayout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
          <div className="container max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
              <div>
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </div>
        </div>
      </FocusLayout>
    );
  }

  if (!product) {
    return (
      <FocusLayout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
          <div className="container max-w-lg text-center">
            <h1 className="mb-4 text-2xl font-bold">Product Not Found</h1>
            <p className="mb-6 text-muted-foreground">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/pricing">View All Products</Link>
            </Button>
          </div>
        </div>
      </FocusLayout>
    );
  }

  const dialectName = (product.dialects as any)?.name || "Arabic";
  const levelName = (product.levels as any)?.name || product.name;
  const unitsCount = levelInfo?.units?.length || 0;
  const successRedirectPath =
    product.scope === "flashcard_pack" ? "/dashboard/progress#flashcards-section" : "/dashboard";

  const features =
    product.scope === "bundle"
      ? [
          "All Beginner, Intermediate & Advanced levels",
          "Lifetime access to all content",
          "Certificate upon completion",
          "Audio lessons with native speakers",
          "Quizzes to test your knowledge",
        ]
      : product.scope === "all"
        ? [
            "Full access to all dialects",
            "All levels across the platform",
            "Lifetime access",
            "All certificates",
            "Priority support",
          ]
        : [
            `${unitsCount} comprehensive units`,
            "Audio lessons with native speakers",
            "Interactive quizzes",
            "Progress tracking",
            `Certificate for ${levelName}`,
          ];

  return (
    <FocusLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-6 sm:py-8 md:py-12">
        <div className="container max-w-4xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <Badge variant="secondary" className="mb-3">
                  {dialectName}
                </Badge>
                <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{product.name}</h1>
                {product.description && (
                  <p className="text-sm text-muted-foreground sm:text-base">{product.description}</p>
                )}
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    What's Included
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 sm:space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="hidden grid-cols-3 gap-4 sm:grid">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <Shield className="mx-auto mb-2 h-6 w-6 text-primary" />
                  <p className="text-xs font-medium">Secure Payment</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
                  <p className="text-xs font-medium">Full Access</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <Award className="mx-auto mb-2 h-6 w-6 text-primary" />
                  <p className="text-xs font-medium">Certificate</p>
                </div>
              </div>
            </div>

            <div>
              <Card className="border-2 border-primary/20 lg:sticky lg:top-8">
                <CardHeader className="border-b bg-primary/5 p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">Complete Your Purchase</CardTitle>
                  <CardDescription className="text-sm">Instant access</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-4 sm:p-6 sm:pt-6">
                  <PayPalCheckout
                    productType={product.id}
                    productName={product.name}
                    price={product.price}
                    successRedirectPath={successRedirectPath}
                    onSuccess={() => {
                      if (product.scope !== "flashcard_pack") {
                        navigate("/dashboard");
                      }
                    }}
                  />
                </CardContent>
              </Card>

              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-950/30 sm:p-4">
                <Shield className="mx-auto mb-2 h-5 w-5 text-green-600 dark:text-green-400 sm:h-6 sm:w-6" />
                <p className="text-xs font-medium text-green-800 dark:text-green-200 sm:text-sm">
                  30-Day Money Back Guarantee
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Not satisfied? Get a full refund, no questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FocusLayout>
  );
}
