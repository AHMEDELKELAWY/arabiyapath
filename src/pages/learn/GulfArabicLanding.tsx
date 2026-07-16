import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateCourseSchema, getDialectSEO, generateFAQPageSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, Headphones, Award, BookOpen, MapPin, MessagesSquare, Users, CheckCircle2 } from "lucide-react";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { FREE_LESSON_URL } from "@/lib/gulfAccess";

const GULF_DIRECT_ANSWER =
  "Gulf Arabic (Khaleeji) is the everyday spoken Arabic of the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. This course teaches you to actually speak it — greetings, work, shopping, taxis, restaurants, and social conversation — with native audio, English translation, and transliteration. Start with a free lesson, then follow the beginner path unit by unit.";

const GULF_FAQS = [
  {
    q: "What is Gulf Arabic (Khaleeji)?",
    a: "Gulf Arabic, also called Khaleeji, is the spoken Arabic dialect used across the Arabian Peninsula — the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. It is what locals actually speak in daily life, and it differs from Modern Standard Arabic (Fusha), which is the formal written form used in news and books.",
  },
  {
    q: "Is Gulf Arabic the same as the Arabic taught in most textbooks?",
    a: "No. Most textbooks teach Fusha (Modern Standard Arabic). Fusha is essential for reading and formal contexts, but people in the Gulf do not speak it in daily life. If your goal is to talk with locals, colleagues, drivers, or neighbors in the UAE or Saudi Arabia, Gulf Arabic is the right choice.",
  },
  {
    q: "How long does it take to learn Gulf Arabic?",
    a: "Most learners can hold basic everyday conversations after completing the beginner level (about 8–12 weeks at 20–30 minutes per day). Reaching confident daily-life fluency typically takes 6–12 months of consistent practice.",
  },
  {
    q: "Do I need to learn the Arabic script first?",
    a: "No. Every lesson includes English transliteration alongside the Arabic script and native audio, so you can start speaking immediately. You can pick up the script gradually as you progress.",
  },
  {
    q: "Will Gulf Arabic be understood outside the Gulf?",
    a: "Yes, largely. Educated Arabic speakers across the Middle East understand Gulf Arabic because of the region's media presence. However, for daily conversation in Egypt or the Levant, the local dialects differ noticeably.",
  },
  {
    q: "Is there a free lesson I can try?",
    a: "Yes. You can start the first Gulf Arabic lesson free — no credit card required — to see how the course works before enrolling.",
  },
];

const GULF_COMPARE = [
  {
    label: "Where it is spoken",
    gulf: "UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman",
    fusha: "Formal media, books, and official documents across the Arab world",
  },
  {
    label: "Best for",
    gulf: "Living, working, or traveling in the Gulf",
    fusha: "Reading news, academia, and formal writing",
  },
  {
    label: "Everyday speech",
    gulf: "Yes — this is what locals actually speak",
    fusha: "No — nobody speaks Fusha at home or in the street",
  },
  {
    label: "Learning curve",
    gulf: "Faster for real conversations",
    fusha: "Slower start; strong for reading",
  },
];

export default function GulfArabicLanding() {
  const seo = getDialectSEO("Gulf Arabic");
  const canonicalPath = "/learn/gulf-arabic";
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Gulf Arabic", path: canonicalPath },
  ]);
  const courseSchema = generateCourseSchema("Gulf Arabic", seo.description, canonicalPath);
  const faqSchema = generateFAQPageSchema(canonicalPath, GULF_FAQS);

  return (
    <>
      <SEOHead
        title="Learn Gulf Arabic Online (Khaleeji) — Speak Arabic in the UAE & Saudi Arabia"
        description="Learn Gulf Arabic (Khaleeji) online with native audio, English translation, and real conversations for the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. Start free."
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
                <span>Gulf Arabic</span>
              </nav>

              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Learn <span className="text-gradient">Gulf Arabic</span> Online (Khaleeji)
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Speak real Arabic in the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman.
                Native audio, everyday conversations, and a clear beginner-to-advanced path.
              </p>

              <div className="max-w-3xl mx-auto mb-10">
                <DirectAnswer
                  text={GULF_DIRECT_ANSWER}
                  linksTitle="Popular next steps"
                  links={[
                    { href: FREE_LESSON_URL, label: "Try a free lesson" },
                    { href: "/pricing?course=gulf", label: "View pricing" },
                    { href: "/blog/gulf-vs-fusha-arabic", label: "Gulf vs. Fusha" },
                    { href: "/learn/fusha-arabic", label: "Fusha Arabic" },
                  ]}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" className="w-full sm:w-auto" asChild>
                  <Link to={FREE_LESSON_URL}>
                    Start Learning Free <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/pricing?course=gulf">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT IS GULF ARABIC */}
        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-4">What is Gulf Arabic?</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Gulf Arabic — often called <strong>Khaleeji</strong> (خليجي) — is the everyday spoken Arabic of the
                Arabian Peninsula. It is the dialect you hear in Dubai coffee shops, Riyadh offices, Doha
                markets, and Kuwaiti living rooms. Roughly 40 million people speak it as a first or second
                language, and it is the working spoken language across a region that hosts millions of expats.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Gulf Arabic shares a foundation with Modern Standard Arabic (Fusha), but it has its own
                pronunciation, everyday vocabulary, and sentence patterns. If you have ever tried to use
                textbook Arabic in the UAE or Saudi Arabia and been met with a polite smile, that is why:
                locals switch to Khaleeji the moment the conversation gets real.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This course focuses on the practical, spoken dialect first — so you can greet, ask, order,
                negotiate, and connect from your first week. You still learn to read and write, but the
                priority is real conversation.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <section className="py-14 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground text-center mb-10">
                Why learners choose this Gulf Arabic course
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: Headphones, title: "Native Khaleeji audio", description: "Every phrase recorded by native Gulf speakers so your pronunciation sounds local, not textbook." },
                  { icon: MessagesSquare, title: "Real conversations", description: "Greetings, taxis, restaurants, shopping, work, and social situations you'll actually use." },
                  { icon: BookOpen, title: "Clear structure", description: "Dialect → Level → Unit → Lesson. You always know what comes next." },
                  { icon: MapPin, title: "Built for the Gulf", description: "Vocabulary and cultural notes tuned for the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman." },
                  { icon: Users, title: "For expats & beginners", description: "No Arabic background required. English translation and transliteration on every card." },
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
                  "Expats living or moving to the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, or Oman.",
                  "Professionals working with Gulf clients, colleagues, or partners.",
                  "Travelers who want to go beyond hotel English and connect with locals.",
                  "Heritage learners who understand a little at home but never learned to speak.",
                  "Fusha (MSA) learners who need spoken dialect for daily life.",
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
              <h2 className="text-3xl font-bold text-foreground mb-3">Gulf Arabic vs. Fusha (MSA)</h2>
              <p className="text-muted-foreground mb-6">
                Both matter — but they serve different goals. Here's the short version:
              </p>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-sm md:text-base">
                  <thead className="bg-accent/40">
                    <tr>
                      <th className="text-left p-4 font-semibold">Aspect</th>
                      <th className="text-left p-4 font-semibold">Gulf Arabic (Khaleeji)</th>
                      <th className="text-left p-4 font-semibold">Fusha (MSA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GULF_COMPARE.map((row, i) => (
                      <tr key={row.label} className={i % 2 ? "bg-background" : ""}>
                        <td className="p-4 font-medium text-foreground">{row.label}</td>
                        <td className="p-4 text-muted-foreground">{row.gulf}</td>
                        <td className="p-4 text-muted-foreground">{row.fusha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Want the deeper comparison?{" "}
                <Link to="/blog/gulf-vs-fusha-arabic" className="text-primary underline">
                  Read Gulf vs. Fusha Arabic
                </Link>{" "}
                or explore the{" "}
                <Link to="/learn/fusha-arabic" className="text-primary underline">
                  Fusha Arabic course
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
                Frequently asked questions about Gulf Arabic
              </h2>
              <div className="space-y-6">
                {GULF_FAQS.map((faq) => (
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
                  { href: "/blog/why-learn-gulf-arabic", label: "Why learn Gulf Arabic" },
                  { href: "/blog/gulf-arabic-course-for-expats", label: "Gulf Arabic for expats" },
                  { href: "/blog/10-daily-gulf-arabic-phrases-for-expats", label: "10 daily Gulf Arabic phrases" },
                  { href: "/blog/how-to-order-food-in-gulf-arabic-dubai", label: "Order food in Gulf Arabic (Dubai)" },
                  { href: "/blog/arabic-for-expats-in-saudi-arabia", label: "Arabic for expats in Saudi Arabia" },
                  { href: "/blog/learn-gulf-arabic-online", label: "Learn Gulf Arabic online" },
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
                Start speaking Gulf Arabic today
              </h2>
              <p className="text-muted-foreground mb-8">
                Try the first lesson free. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" asChild>
                  <Link to={FREE_LESSON_URL}>
                    Start Free Lesson <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/pricing?course=gulf">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
