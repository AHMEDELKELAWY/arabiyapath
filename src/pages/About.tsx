import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target, Heart, Lightbulb, Users, ArrowRight, MapPin, Phone } from "lucide-react";
import logo from "@/assets/logo.png";

const values = [
  {
    icon: Target,
    title: "Practical First",
    description: "Every lesson is designed around real-world scenarios you'll actually encounter.",
  },
  {
    icon: Heart,
    title: "Cultural Immersion",
    description: "Language learning goes beyond words—we teach context, etiquette, and culture.",
  },
  {
    icon: Lightbulb,
    title: "Science-Backed",
    description: "Our curriculum is built on proven language acquisition research and methodology.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Join a supportive community of learners sharing the same journey as you.",
  },
];

const team = [
  {
    name: "Ahmed Fawzy",
    role: "CEO",
    bio: "Founder and Chief Executive Officer of ArabiyaPath.",
    avatar: "👨‍💼",
  },
  {
    name: "Eng. Houria Shafik",
    role: "Language & Islamic Studies Educator",
    bio: "Engineer and teacher specializing in languages and Islamic sciences.",
    avatar: "👩‍🏫",
  },
];

export default function About() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-[0.03]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Making Arabic <span className="text-gradient">Accessible</span> to Everyone
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              ArabiyaPath was founded with a simple mission: to break down the barriers 
              that make Arabic seem intimidating and help anyone, anywhere, learn to speak 
              Arabic with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    ArabiyaPath began when our founders—a team of language educators and 
                    technology experts—noticed a significant gap in Arabic learning resources.
                  </p>
                  <p>
                    Most courses focused on Modern Standard Arabic alone, ignoring the 
                    rich dialects that 400+ million people actually speak in their daily lives.
                  </p>
                  <p>
                    We set out to create a platform that teaches <strong>real Arabic</strong>—the 
                    kind you hear in markets, cafes, and homes across the Arab world.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl flex items-center justify-center">
                  <div className="text-center">
                    <img src={logo} alt="ArabiyaPath Logo" className="w-32 h-32 mx-auto mb-4 object-contain" />
                    <p className="text-lg font-semibold text-foreground">Connecting Cultures</p>
                    <p className="text-sm text-muted-foreground">Through Language</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at ArabiyaPath.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-card rounded-2xl p-6 border border-border text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Passionate educators and native speakers dedicated to your success.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-card rounded-2xl p-6 border border-border text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-4xl mx-auto mb-4">
                  {member.avatar}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{member.name}</h3>
                <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-6">Contact Us</h2>
            <div className="bg-card rounded-2xl p-8 border border-border space-y-4">
              <div className="flex items-center justify-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <p className="text-muted-foreground">Egypt, Alexandria, El-Mandara</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <a 
                  href="tel:+201067070409" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  01067070409
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-hero-gradient rounded-3xl p-8 md:p-12 text-center pattern-overlay">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Join Our Learning Community
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Start your Arabic learning journey today and become part of a growing 
              community of language enthusiasts.
            </p>
            <Button size="xl" variant="gold" asChild>
              <Link to="/signup">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
