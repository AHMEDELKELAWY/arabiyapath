import { useParams, Link } from "react-router-dom";
import { useDialectLevels } from "@/hooks/useLearning";
import { Layout } from "@/components/layout/Layout";
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
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${dialect.image_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
          
          <div className="relative container max-w-4xl py-16">
            <Badge variant="secondary" className="mb-4">Arabic Dialect</Badge>
            <h1 className="text-5xl font-bold text-foreground mb-4">
              {dialect.name}
            </h1>
            {dialect.description && (
              <p className="text-xl text-muted-foreground max-w-2xl">
                {dialect.description}
              </p>
            )}
          </div>
        </div>

        {/* Levels */}
        <div className="container max-w-4xl py-8 -mt-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Choose Your Level
          </h2>
          
          <div className="grid gap-6">
            {levels.map((level, index) => {
              const Icon = getLevelIcon(index);
              const gradientClass = getLevelColor(index);
              
              return (
                <Link key={level.id} to={`/learn/level/${level.id}`}>
                  <Card className="transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        {/* Icon Section */}
                        <div className={`bg-gradient-to-br ${gradientClass} p-8 flex items-center justify-center`}>
                          <Icon className="h-12 w-12 text-white" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 p-6 flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-foreground">
                              {level.name}
                            </h3>
                            <p className="text-muted-foreground mt-1">
                              {index === 0 && "Start your journey with essential phrases and conversations"}
                              {index === 1 && "Expand your vocabulary and handle complex situations"}
                              {index === 2 && "Achieve fluency with advanced topics and nuances"}
                            </p>
                          </div>
                          <ChevronRight className="h-6 w-6 text-muted-foreground shrink-0" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {levels.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Levels coming soon! Check back later.
              </p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
