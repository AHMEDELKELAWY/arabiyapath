import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
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
  Sparkles
} from "lucide-react";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const levelId = searchParams.get("levelId");
  const dialectId = searchParams.get("dialectId");
  const productId = searchParams.get("productId");

  // Fetch product data based on params
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

  // Fetch level info for features
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

  // Not logged in - show login prompt
  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
          <div className="container max-w-lg">
            <Card className="border-2">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Sign in to Continue</CardTitle>
                <CardDescription>
                  Create an account or sign in to purchase and access your courses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full" size="lg">
                  <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link to={`/signup?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                    Create Account
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
          <div className="container max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8">
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
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12">
          <div className="container max-w-lg text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/pricing">View All Products</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const dialectName = (product.dialects as any)?.name || "Arabic";
  const levelName = (product.levels as any)?.name || product.name;
  const unitsCount = levelInfo?.units?.length || 0;

  // Features based on product type
  const features = product.scope === "bundle" 
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
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 md:py-12">
        <div className="container max-w-4xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="mb-6 gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-3">
                  {dialectName}
                </Badge>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                {product.description && (
                  <p className="text-muted-foreground">{product.description}</p>
                )}
              </div>

              {/* Features */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    What's Included
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Trust Signals */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs font-medium">Secure Payment</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs font-medium">Lifetime Access</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs font-medium">Certificate</p>
                </div>
              </div>
            </div>

            {/* Checkout Form */}
            <div>
              <Card className="sticky top-8 border-2 border-primary/20">
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle className="text-xl">Complete Your Purchase</CardTitle>
                  <CardDescription>
                    One-time payment • Instant access
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <PayPalCheckout
                    productType={product.id}
                    productName={product.name}
                    price={product.price}
                    onSuccess={() => {
                      navigate("/dashboard");
                    }}
                  />
                </CardContent>
              </Card>

              {/* Money Back Guarantee */}
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
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
    </Layout>
  );
}
