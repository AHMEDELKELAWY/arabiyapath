import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MapPin, Users, BookOpen, Clock } from "lucide-react";

// Static config for dialect presentation
const dialectConfig: Record<string, {
  arabicName: string;
  icon: string;
  gradient: string;
  bgLight: string;
  stats: { speakers: string; lessons: string; duration: string };
  regions: string[];
  features: string[];
}> = {
  "Gulf Arabic": {
    arabicName: "العربية الخليجية",
    icon: "🏜️",
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50",
    stats: { speakers: "36M+", lessons: "80+", duration: "3 months" },
    regions: ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman"],
    features: ["Business Arabic vocabulary", "Daily conversation patterns", "Cultural etiquette", "Travel essentials"],
  },
  "Egyptian Arabic": {
    arabicName: "العربية المصرية",
    icon: "🏛️",
    gradient: "from-teal-500 to-emerald-600",
    bgLight: "bg-teal-50",
    stats: { speakers: "100M+", lessons: "80+", duration: "3 months" },
    regions: ["Egypt", "Sudan (partial)"],
    features: ["Everyday expressions", "Media & entertainment vocabulary", "Colloquial phrases", "Cultural references"],
  },
  "Modern Standard Arabic": {
    arabicName: "العربية الفصحى",
    icon: "📜",
    gradient: "from-indigo-500 to-purple-600",
    bgLight: "bg-indigo-50",
    stats: { speakers: "420M+", lessons: "450+", duration: "6 months" },
    regions: ["All Arab Countries", "International Organizations"],
    features: ["Formal communication", "News & media literacy", "Academic Arabic", "Literary foundations"],
  },
};

const defaultConfig = {
  arabicName: "العربية",
  icon: "📚",
  gradient: "from-gray-500 to-gray-600",
  bgLight: "bg-gray-50",
  stats: { speakers: "N/A", lessons: "80+", duration: "3 months" },
  regions: ["Multiple Regions"],
  features: ["Core vocabulary", "Grammar fundamentals", "Conversation practice", "Cultural context"],
};

export default function Dialects() {
  const { data: dialects, isLoading } = useQuery({
    queryKey: ["dialects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dialects")
        .select("id, name, description")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Choose Your <span className="text-gradient">Arabic Dialect</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Each dialect opens doors to different regions and cultures. 
              Select the one that matches your goals and start your journey.
            </p>
          </div>
        </div>
      </section>

      {/* Dialects Grid */}
      <section className="py-12 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-80 rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {dialects?.map((dialect) => {
                const config = dialectConfig[dialect.name] || defaultConfig;
                
                return (
                  <div
                    key={dialect.id}
                    className="bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-0">
                      {/* Left - Icon & Basic Info */}
                      <div className={`${config.bgLight} p-6 sm:p-8 lg:p-12 flex flex-col justify-center`}>
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-3xl sm:text-4xl mb-4 sm:mb-6 shadow-lg`}>
                          {config.icon}
                        </div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
                          {dialect.name}
                        </h2>
                        <p className="text-lg sm:text-xl text-muted-foreground font-medium mb-4" dir="rtl">
                          {config.arabicName}
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {config.regions.slice(0, 4).map((region) => (
                            <span
                              key={region}
                              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-background text-xs sm:text-sm text-muted-foreground"
                            >
                              <MapPin className="w-3 h-3 hidden sm:block" />
                              {region}
                            </span>
                          ))}
                          {config.regions.length > 4 && (
                            <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-background text-xs sm:text-sm text-muted-foreground">
                              +{config.regions.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle - Description & Features */}
                      <div className="p-6 sm:p-8 lg:p-12 lg:col-span-2">
                        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                          {dialect.description || `Learn ${dialect.name} with our comprehensive curriculum designed for practical fluency.`}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
                          <div className="bg-muted/50 rounded-xl p-3 sm:p-4 text-center">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-1 sm:mb-2" />
                            <div className="text-sm sm:text-lg font-bold text-foreground">{config.stats.speakers}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">Speakers</div>
                          </div>
                          <div className="bg-muted/50 rounded-xl p-3 sm:p-4 text-center">
                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-1 sm:mb-2" />
                            <div className="text-sm sm:text-lg font-bold text-foreground">{config.stats.lessons}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">Lessons</div>
                          </div>
                          <div className="bg-muted/50 rounded-xl p-3 sm:p-4 text-center">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-1 sm:mb-2" />
                            <div className="text-sm sm:text-lg font-bold text-foreground">{config.stats.duration}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">Duration</div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="mb-6 sm:mb-8">
                          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3 uppercase tracking-wide">
                            What You'll Learn
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            {config.features.map((feature) => (
                              <div key={feature} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.gradient} shrink-0`} />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA - Links to the actual dialect overview */}
                        <Button size="lg" asChild className="w-full sm:w-auto text-sm sm:text-base">
                          <Link to={`/learn/dialect/${dialect.id}`}>
                            Start Learning {dialect.name}
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Comparison Note */}
      <section className="py-12 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Not Sure Which to Choose?
            </h2>
            <p className="text-muted-foreground mb-6">
              <strong>Gulf Arabic</strong> is ideal for business in the Gulf region. 
              <strong> Egyptian Arabic</strong> is best for media and widest understanding. 
              <strong> Modern Standard Arabic</strong> is perfect for formal settings and academia.
            </p>
            <Button variant="outline" asChild>
              <Link to="/contact">Ask Our Experts</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
