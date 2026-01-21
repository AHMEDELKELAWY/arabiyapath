import { useParams, Link } from "react-router-dom";
import { useDialectLevels } from "@/hooks/useLearning";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, getDialectSEO, generateCourseSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronRight, 
  GraduationCap,
  BookOpen,
  Trophy
} from "lucide-react";

export default function DialectOverview() {
  const { dialectId } = useParams();
  const { data, isLoading } = useDialectLevels(dialectId);

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

  const getLevelIcon = (index: number) => {
    switch (index) {
      case 0: return BookOpen;
      case 1: return GraduationCap;
      default: return Trophy;
    }
  };

  const getLevelColor = (index: number) => {
    switch (index) {
      case 0: return "from-green-500 to-emerald-600";
      case 1: return "from-blue-500 to-indigo-600";
      default: return "from-purple-500 to-pink-600";
    }
  };

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
          
          <div className="relative container max-w-4xl py-10 sm:py-16 px-4 sm:px-6">
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
          
          <div className="grid gap-4 sm:gap-6">
            {levels.map((level, index) => {
              const Icon = getLevelIcon(index);
              const gradientClass = getLevelColor(index);
              
              return (
                <Link key={level.id} to={`/learn/level/${level.id}`}>
                  <Card className="transition-all hover:shadow-lg hover:scale-[1.01] sm:hover:scale-[1.02] overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        {/* Icon Section */}
                        <div className={`bg-gradient-to-br ${gradientClass} p-4 sm:p-6 md:p-8 flex items-center justify-center`}>
                          <Icon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 p-4 sm:p-6 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                              {level.name}
                            </h3>
                            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1 line-clamp-2">
                              {index === 0 && "Start your journey with essential phrases"}
                              {index === 1 && "Expand vocabulary and handle complex situations"}
                              {index === 2 && "Achieve fluency with advanced topics"}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground shrink-0" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
