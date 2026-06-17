import { useParams, Link, useNavigate } from "react-router-dom";
import { PageNav } from "@/components/learn/PageNav";
import { useEffect } from "react";
import { useDialectLevels } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/hooks/usePurchases";
import { useDashboardData } from "@/hooks/useDashboardData";
import { isGulfArabic, GULF_SALES_URL } from "@/lib/gulfAccess";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, getDialectSEO, generateCourseSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelProgressCard } from "@/components/dashboard/LevelProgressCard";

export default function DialectOverview() {
  const { dialectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useDialectLevels(dialectId);
  const { checkLevelAccess, isLoading: purchasesLoading } = usePurchases();
  const { levelsByDialect, hasLevelAccess } = useDashboardData();

  // Hard redirect: Gulf Arabic without any purchase → sales page
  useEffect(() => {
    if (isLoading || purchasesLoading) return;
    if (!isGulfArabic(dialectId)) return;
    
    // Check if user has access to at least one Gulf Arabic level
    const hasAnyGulfAccess = data?.levels?.some((level: any) =>
      user ? checkLevelAccess(level.id, dialectId!, level.order_index, 1) : false
    );
    
    if (!hasAnyGulfAccess) {
      navigate(GULF_SALES_URL, { replace: true });
    }
  }, [isLoading, purchasesLoading, dialectId, data, user, checkLevelAccess, navigate]);


  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl py-8 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Dialect not found</h1>
          <Button asChild className="mt-6">
            <Link to="/dialects">Browse Dialects</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const { dialect, levels } = data;
  const seoData = getDialectSEO(dialect.name);
  const canonicalPath = `/learn/dialect/${dialectId}`;
  const courseSchema = generateCourseSchema(dialect.name, seoData.description, canonicalPath);

  const dialectGroup = levelsByDialect.find((g) => g.dialectId === dialectId);
  const progressByLevel = new Map(
    (dialectGroup?.levels || []).map((l) => [l.levelId, l])
  );

  return (
    <>
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        canonicalPath={canonicalPath}
        jsonLd={courseSchema}
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${dialect.image_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
          
          <div className="relative container max-w-4xl py-6 sm:py-10 px-4 sm:px-6">
            <PageNav
              crumbs={[
                { label: "Dashboard", to: "/dashboard" },
                { label: dialect.name },
              ]}
              backTo="/dashboard"
              backLabel="Back to Dashboard"
              className="mb-4 sm:mb-6"
            />
            <Badge variant="secondary" className="mb-3 sm:mb-4 text-xs sm:text-sm">Arabic Dialect</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              {dialect.name}
            </h1>
            {dialect.description && (
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl">
                {dialect.description}
              </p>
            )}
          </div>
        </div>

        {/* Levels */}
        <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6 -mt-4 sm:-mt-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
            Choose Your Level
          </h2>
          
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {levels.map((level) => {
              const p = progressByLevel.get(level.id);
              return (
                <LevelProgressCard
                  key={level.id}
                  levelId={level.id}
                  levelName={level.name}
                  dialectId={dialectId!}
                  completedLessons={p?.completedLessons ?? 0}
                  totalLessons={p?.totalLessons ?? 0}
                  completedUnits={p?.completedUnits ?? 0}
                  totalUnits={p?.totalUnits ?? 0}
                  progressPercent={p?.progressPercent ?? 0}
                  hasAccess={user ? hasLevelAccess(level.id, dialectId!) : false}
                />
              );
            })}
          </div>


          {levels.length === 0 && (
            <Card className="p-6 sm:p-8 text-center">
              <p className="text-muted-foreground text-sm sm:text-base">
                Levels coming soon! Check back later.
              </p>
            </Card>
          )}
        </div>
        </div>
      </Layout>
    </>
  );
}
