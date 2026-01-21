import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateOrganizationSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Award, Users, Globe, Headphones, CheckCircle2 } from "lucide-react";
import { trackBookTrial } from "@/lib/analytics";

const organizationSchema = generateOrganizationSchema();

const dialects = [
  {
    name: "Gulf Arabic",
    description: "UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman",
    icon: "🏜️",
    color: "from-amber-500 to-orange-600",
  },
  {
    name: "Egyptian Arabic",
    description: "The most widely understood dialect",
    icon: "🏛️",
    color: "from-teal-500 to-emerald-600",
  },
  {
    name: "Modern Standard Arabic",
    description: "Formal Arabic (Fusha) for media & literature",
    icon: "📜",
    color: "from-indigo-500 to-purple-600",
  },
];

const features = [
  {
    icon: Headphones,
    title: "Native Audio",
    description: "Listen to native speakers pronounce every phrase correctly",
  },
  {
    icon: BookOpen,
    title: "Real-Life Scenarios",
    description: "Learn vocabulary you'll actually use in daily conversations",
  },
  {
    icon: Award,
    title: "Earn Certificates",
    description: "Get shareable certificates as you complete each level",
  },
  {
    icon: Users,
    title: "Community Support",
    description: "Join thousands of learners on their Arabic journey",
  },
];

const stats = [
  { value: "10,000+", label: "Active Learners" },
  { value: "3", label: "Arabic Dialects" },
  { value: "200+", label: "Lessons" },
  { value: "95%", label: "Success Rate" },
];

export default function Index() {
  return (
    <>
      <SEOHead
        canonicalPath="/"
        title=""
        description="Learn Arabic dialects online with ArabiyaPath. Master Gulf, Egyptian, or Modern Standard Arabic through immersive lessons, native audio, and earn certificates."
        jsonLd={organizationSchema}
      />
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6 animate-fade-in">
              <Globe className="w-4 h-4" />
              Learn Arabic the natural way
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up">
              Master Arabic
              <span className="text-gradient block mt-2">Speak Like a Native</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Choose your dialect, learn real conversations, and earn certificates. 
              The most effective way for foreigners to learn Arabic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Button 
                size="xl" 
                variant="hero" 
                asChild
                onClick={() => trackBookTrial("Start Learning Free", "hero_section")}
              >
                <Link to="/free-trial">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/dialects">Explore Dialects</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </section>

      {/* Dialects Section */}
      <section className="py-20 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Choose Your Arabic Path
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select the dialect that matches your goals. Each path is designed for real-world fluency.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {dialects.map((dialect, index) => (
              <Link
                key={dialect.name}
                to="/dialects"
                className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${dialect.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                  {dialect.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {dialect.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {dialect.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Start learning <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose ArabiyaPath?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our proven methodology helps you learn faster and retain more.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-hero-gradient pattern-overlay">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-primary-foreground/80 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start speaking Arabic in just three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Choose Your Dialect", description: "Pick Gulf, Egyptian, or Modern Standard Arabic based on your needs" },
              { step: "02", title: "Learn Daily Scenarios", description: "Master real conversations from greetings to shopping to travel" },
              { step: "03", title: "Earn Your Certificate", description: "Complete quizzes and get your shareable achievement certificate" },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary/20 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-card rounded-3xl p-8 md:p-12 border border-border shadow-xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Start Your Arabic Journey?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of learners who are already speaking Arabic confidently. 
              Start with free lessons today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="xl" 
                variant="hero" 
                asChild
                onClick={() => trackBookTrial("Get Started Free", "cta_section")}
              >
                <Link to="/free-trial">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Free trial included
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>
      </Layout>
    </>
  );
}
