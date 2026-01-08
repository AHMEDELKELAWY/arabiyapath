import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Users, BookOpen, Clock } from "lucide-react";

const dialects = [
  {
    id: "gulf",
    name: "Gulf Arabic",
    arabicName: "العربية الخليجية",
    description: "Spoken across the Arabian Gulf region including UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. Essential for business and travel in these countries.",
    icon: "🏜️",
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50",
    stats: {
      speakers: "36M+",
      lessons: "80+",
      duration: "3 months",
    },
    regions: ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman"],
    features: [
      "Business Arabic vocabulary",
      "Daily conversation patterns",
      "Cultural etiquette",
      "Travel essentials",
    ],
  },
  {
    id: "egyptian",
    name: "Egyptian Arabic",
    arabicName: "العربية المصرية",
    description: "The most widely understood Arabic dialect, thanks to Egypt's influential film and music industry. Perfect for understanding Arabic media and culture.",
    icon: "🏛️",
    gradient: "from-teal-500 to-emerald-600",
    bgLight: "bg-teal-50",
    stats: {
      speakers: "100M+",
      lessons: "80+",
      duration: "3 months",
    },
    regions: ["Egypt", "Sudan (partial)"],
    features: [
      "Everyday expressions",
      "Media & entertainment vocabulary",
      "Colloquial phrases",
      "Cultural references",
    ],
  },
  {
    id: "msa",
    name: "Modern Standard Arabic",
    arabicName: "العربية الفصحى",
    description: "The formal variety used in official settings, news, literature, and education across all Arab countries. Foundation for understanding classical Arabic.",
    icon: "📜",
    gradient: "from-indigo-500 to-purple-600",
    bgLight: "bg-indigo-50",
    stats: {
      speakers: "420M+",
      lessons: "80+",
      duration: "3 months",
    },
    regions: ["All Arab Countries", "International Organizations"],
    features: [
      "Formal communication",
      "News & media literacy",
      "Academic Arabic",
      "Literary foundations",
    ],
  },
];

export default function Dialects() {
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
          <div className="space-y-8">
            {dialects.map((dialect, index) => (
              <div
                key={dialect.id}
                className="bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="grid lg:grid-cols-3 gap-0">
                  {/* Left - Icon & Basic Info */}
                  <div className={`${dialect.bgLight} p-8 lg:p-12 flex flex-col justify-center`}>
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${dialect.gradient} flex items-center justify-center text-4xl mb-6 shadow-lg`}>
                      {dialect.icon}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      {dialect.name}
                    </h2>
                    <p className="text-xl text-muted-foreground font-medium mb-4" dir="rtl">
                      {dialect.arabicName}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {dialect.regions.map((region) => (
                        <span
                          key={region}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-background text-sm text-muted-foreground"
                        >
                          <MapPin className="w-3 h-3" />
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Middle - Description & Features */}
                  <div className="p-8 lg:p-12 lg:col-span-2">
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {dialect.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="bg-muted/50 rounded-xl p-4 text-center">
                        <Users className="w-5 h-5 text-primary mx-auto mb-2" />
                        <div className="text-lg font-bold text-foreground">{dialect.stats.speakers}</div>
                        <div className="text-xs text-muted-foreground">Native Speakers</div>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-4 text-center">
                        <BookOpen className="w-5 h-5 text-primary mx-auto mb-2" />
                        <div className="text-lg font-bold text-foreground">{dialect.stats.lessons}</div>
                        <div className="text-xs text-muted-foreground">Lessons</div>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-4 text-center">
                        <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                        <div className="text-lg font-bold text-foreground">{dialect.stats.duration}</div>
                        <div className="text-xs text-muted-foreground">To Complete</div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                        What You'll Learn
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {dialect.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${dialect.gradient}`} />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <Button size="lg" asChild className="w-full sm:w-auto">
                      <Link to="/signup">
                        Start Learning {dialect.name}
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
