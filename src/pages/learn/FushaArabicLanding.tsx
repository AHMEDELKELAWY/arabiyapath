import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateCourseSchema, getDialectSEO, generateFAQPageSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Globe2, Award, GraduationCap, Newspaper, ScrollText, CheckCircle2 } from "lucide-react";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { DirectAnswer } from "@/components/seo/DirectAnswer";

const FUSHA_DIRECT_ANSWER =
  "Fusha (فصحى), also called Modern Standard Arabic (MSA), is the formal Arabic used in books, news, government, and academia across the entire Arab world. This course teaches you Fusha step by step — reading, writing, listening, and grammar — with native audio, English translation, and transliteration. Start with a free lesson and follow the beginner path unit by unit.";

const FUSHA_FAQS = [
  {
    q: "What is Fusha Arabic?",
    a: "Fusha (Arabic: فصحى) is the formal, standardized form of Arabic. It is the same across all Arab countries and is used in news broadcasts, newspapers, books, official documents, education, and religious texts. It descends from Classical Arabic and is often called Modern Standard Arabic (MSA) in English.",
  },
  {
    q: "What is the difference between Fusha and Modern Standard Arabic (MSA)?",
    a: "For learners, they are the same thing. 'Fusha' is the Arabic name; 'Modern Standard Arabic (MSA)' is the English label used in academia and language courses. Both refer to the formal, written and broadcast form of Arabic used across the Arab world today.",
  },
  {
    q: "Should I learn Fusha or a dialect first?",
    a: "It depends on your goal. If you want to read, watch the news, study Arabic academically, or read religious texts, start with Fusha. If your goal is daily conversation in a specific country (like the UAE or Egypt), start with that dialect. Many learners eventually study both.",
  },
  {
    q: "Is Fusha spoken in daily conversation?",
    a: "Not usually. Fusha is used in formal contexts — news, speeches, education, and writing — but people speak local dialects (Gulf, Egyptian, Levantine, etc.) at home and in the street. Learning Fusha gives you a pan-Arab foundation; learning a dialect gives you daily conversation.",
  },
  {
    q: "How long does it take to learn Fusha?",
    a: "With 20–30 minutes of daily practice, most learners finish the beginner level in 2–3 months and can read simple news headlines and short texts within 6 months. Comfortable reading and listening usually takes 12–18 months of consistent study.",
  },
  {
    q: "Do I need to know the Arabic alphabet first?",
    a: "No. The course starts from zero. You learn the Arabic script alongside vocabulary and grammar, with English transliteration and native audio on every lesson.",
  },
];

const FUSHA_COMPARE = [
  {
    label: "Best for",
    fusha: "Reading, media, academia, formal writing, religious texts",
    dialect: "Daily conversation in a specific country",
  },
  {
    label: "Where it is used",
    fusha: "Across the entire Arab world (identical everywhere)",
    dialect: "Region-specific (Gulf, Egyptian, Levantine, etc.)",
  },
  {
    label: "Spoken at home?",
    fusha: "No — nobody uses Fusha in casual conversation",
    dialect: "Yes — this is what people actually speak",
  },
  {
    label: "Writing & reading",
    fusha: "Essential — Fusha is the written standard",
    dialect: "Rarely written formally",
  },
];

export default function FushaArabicLanding() {
  const seo = getDialectSEO("Modern Standard Arabic");
  const canonicalPath = "/learn/fusha-arabic";
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Fusha Arabic", path: canonicalPath },
  ]);
  const courseSchema = generateCourseSchema("Modern Standard Arabic", seo.description, canonicalPath);
  const faqSchema = generateFAQPageSchema(canonicalPath, FUSHA_FAQS);

  return (
    <>
      <SEOHead
        title="Learn Fusha Arabic Online — Modern Standard Arabic (MSA) Course"
        description="Learn Fusha (Modern Standard Arabic) online with native audio, English translation, and structured lessons for reading, writing, listening, and grammar. Start free."
        canonicalPath={canonicalPath}
        jsonLd={[breadcrumbSchema, courseSchema, faqSchema]}
      />
      <Layout>
        {/* HERO */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-primary">Home</Link>
                <span className="mx-2">/</span>
                <span>Fusha Arabic</span>
              </nav>

              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Learn <span className="text-gradient">Fusha Arabic</span> Online (Modern Standard Arabic)
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Master the formal Arabic of media, books, and academia — with native audio,
                clear grammar, and a structured beginner-to-advanced path.
              </p>

              <div className="max-w-3xl mx-auto mb-10">
                <DirectAnswer
                  text={FUSHA_DIRECT_ANSWER}
                  linksTitle="Popular next steps"
                  links={[
                    { href: "/signup?redirect=/learn/fusha-arabic", label: "Start free" },
                    { href: "/pricing?course=fusha", label: "View pricing" },
                    { href: "/blog/fusha-vs-gulf-arabic", label: "Fusha vs. Gulf" },
                    { href: "/learn/gulf-arabic", label: "Gulf Arabic" },
                  ]}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" className="w-full sm:w-auto" asChild>
                  <Link to="/learn/lesson/0505e258-c8a7-4fbe-ada8-084c78ce4529">
                    Start Learning Free <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/pricing?course=fusha">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT IS FUSHA */}
        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-4">What is Fusha Arabic?</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                <strong>Fusha</strong> (فصحى) is the formal standard of the Arabic language. It is what
                you see on Al Jazeera and BBC Arabic, in newspapers from Morocco to Oman, in school
                textbooks, government documents, and academic writing. In English, Fusha is usually called
                <strong> Modern Standard Arabic (MSA)</strong>.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Fusha is remarkably consistent. A well-written article in Riyadh looks and sounds the same
                as one in Cairo, Beirut, or Tunis. That makes Fusha the single most useful form of Arabic
                for reading, listening to news, and communicating in professional or academic contexts
                across the entire Arab world.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                People do not usually <em>speak</em> Fusha in daily life — for that, they use local
                dialects like{" "}
                <Link to="/learn/gulf-arabic" className="text-primary underline">Gulf Arabic (Khaleeji)</Link>
                . But every dialect grows from the same Fusha root, which is why learning Fusha gives you
                a foundation that transfers everywhere.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <section className="py-14 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground text-center mb-10">
                Why learners choose this Fusha course
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: Globe2, title: "One Arabic, 22 countries", description: "Fusha is understood everywhere Arabic is spoken — from Morocco to Oman." },
                  { icon: BookOpen, title: "Structured lessons", description: "Dialect → Level → Unit → Lesson. Clear progression from alphabet to advanced." },
                  { icon: Newspaper, title: "Real Arabic media", description: "Learn the exact register used in news, journalism, and formal broadcasting." },
                  { icon: ScrollText, title: "Reading & writing focus", description: "Build the script, vocabulary, and grammar you need to read confidently." },
                  { icon: GraduationCap, title: "Academic-ready", description: "The foundation used by university Arabic programs and CEFR-aligned study." },
                  { icon: Award, title: "Earn certificates", description: "Shareable certificates as you complete each level of the course." },
                ].map((f) => (
                  <div key={f.title} className="bg-card rounded-2xl p-6 border border-border">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-6">Who this course is for</h2>
              <ul className="space-y-3 text-muted-foreground">
                {[
                  "University students and independent learners studying Arabic academically.",
                  "Journalists, researchers, and analysts who need to read Arabic media.",
                  "Professionals in diplomacy, NGOs, or international business.",
                  "Learners of religious texts (Qur'an, hadith, classical literature).",
                  "Dialect learners who want a stronger reading, writing, and grammar base.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="py-14 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-3">Fusha vs. spoken dialects</h2>
              <p className="text-muted-foreground mb-6">
                Fusha and dialects work together. Here's how they compare at a glance:
              </p>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-sm md:text-base">
                  <thead className="bg-accent/40">
                    <tr>
                      <th className="text-left p-4 font-semibold">Aspect</th>
                      <th className="text-left p-4 font-semibold">Fusha (MSA)</th>
                      <th className="text-left p-4 font-semibold">Spoken Dialects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FUSHA_COMPARE.map((row, i) => (
                      <tr key={row.label} className={i % 2 ? "bg-background" : ""}>
                        <td className="p-4 font-medium text-foreground">{row.label}</td>
                        <td className="p-4 text-muted-foreground">{row.fusha}</td>
                        <td className="p-4 text-muted-foreground">{row.dialect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Deeper comparison:{" "}
                <Link to="/blog/fusha-vs-gulf-arabic" className="text-primary underline">
                  Fusha vs. Gulf Arabic
                </Link>{" "}
                or explore the{" "}
                <Link to="/learn/gulf-arabic" className="text-primary underline">
                  Gulf Arabic course
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-8">
                Frequently asked questions about Fusha Arabic
              </h2>
              <div className="space-y-6">
                {FUSHA_FAQS.map((faq) => (
                  <div key={faq.q} className="bg-card rounded-2xl p-6 border border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RELATED */}
        <section className="py-14 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-6">Keep exploring</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { href: "/blog/fusha-vs-gulf-arabic", label: "Fusha vs. Gulf Arabic" },
                  { href: "/blog/gulf-vs-fusha-arabic", label: "Gulf vs. Fusha Arabic" },
                  { href: "/blog/learn-arabic-beginners-guide", label: "Learn Arabic: beginner's guide" },
                  { href: "/blog/learn-arabic-online", label: "Learn Arabic online" },
                  { href: "/blog/best-arabic-learning-app", label: "Best Arabic learning app" },
                  { href: "/flashcards", label: "Fusha vocabulary flashcards" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    to={l.href}
                    className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    <span className="font-medium">{l.label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center bg-card border border-border rounded-3xl p-10">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Start reading and understanding Arabic
              </h2>
              <p className="text-muted-foreground mb-8">
                Try the first Fusha lesson free. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" asChild>
                  <Link to="/learn/lesson/0505e258-c8a7-4fbe-ada8-084c78ce4529">
                    Start Free Lesson <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing?course=fusha">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
