import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateCourseSchema } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Headphones,
  Award,
  BookOpen,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Package,
  Zap,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";

// --------------- DATA ---------------

const trustBullets = [
  { icon: Headphones, text: "Native audio pronunciation" },
  { icon: MessageSquare, text: "Real-life scenarios (work, shopping, daily life)" },
  { icon: Award, text: "Quizzes + completion certificate" },
];

const whyCards = [
  {
    icon: Zap,
    title: "No grammar overload",
    description: "Speak first, understand later. Each lesson focuses on phrases you'll use today — not abstract rules.",
  },
  {
    icon: MessageSquare,
    title: "Dialects that match real life",
    description: "Gulf Arabic is what people actually speak in the UAE & GCC. This course mirrors daily conversations, not textbook Fusha.",
  },
  {
    icon: RefreshCw,
    title: "Repeatable speaking framework",
    description: "Learn one phrase pattern and reuse it across dozens of real situations — shopping, taxis, meetings, and more.",
  },
];

const phrases = [
  { arabic: "هلا، شلونك؟", translit: "hala, shlonak?", english: "Hi, how are you?" },
  { arabic: "يعطيك العافية", translit: "ya'teek al-'aafya", english: "Thanks / may God give you strength" },
  { arabic: "الحساب لو سمحت", translit: "al-hisaab law samaht", english: "The bill, please" },
  { arabic: "وين …؟", translit: "wain …?", english: "Where is …?" },
  { arabic: "كم هذا؟", translit: "kam haadha?", english: "How much is this?" },
  { arabic: "إن شاء الله", translit: "in shaa' Allah", english: "God willing" },
  { arabic: "ما عليه", translit: "maa alaih", english: "No problem / never mind" },
  { arabic: "أبي أروح", translit: "abi arooh", english: "I want to go" },
  { arabic: "مشكور / مشكورة", translit: "mashkoor / mashkoora", english: "Thank you (m/f)" },
  { arabic: "الله يسلّمك", translit: "Allah ysalmak", english: "God keep you safe" },
];

const beginnerFeatures = [
  "Core structured lessons (Level 1)",
  "Native audio + transliteration",
  "Unit quizzes",
  "Completion certificate",
  "Lifetime access",
];

const bundleFeatures = [
  "All 3 levels included",
  "All lessons + quizzes",
  "All certificates",
  "Lifetime access",
  "1 Private Evaluation Session",
];

const screenshots = [
  { src: "/images/course-lesson.png", caption: "Learn phrases with native audio" },
  { src: "/images/course-units.png", caption: "Structured lessons by topic" },
  { src: "/images/course-levels.png", caption: "Track progress by unit" },
  { src: "/images/course-dashboard.png", caption: "See your overall progress" },
  { src: "/images/course-certificate.png", caption: "Earn a completion certificate" },
];

const steps = [
  { num: "1", title: "Instant login access", description: "Create your account and jump straight into the course." },
  { num: "2", title: "Start lessons + audio practice", description: "Learn phrases with native audio, transliteration, and images." },
  { num: "3", title: "Take quizzes and track progress", description: "Complete unit quizzes, earn certificates, and see your growth." },
];

const faqs = [
  { q: "Is this course for complete beginners?", a: "Absolutely! The Beginner level assumes zero Arabic knowledge. Every phrase comes with transliteration (English letters) and native audio so you can learn to speak from day one." },
  { q: "Do I need to learn the Arabic alphabet?", a: "No. Every lesson shows the Arabic script alongside transliteration and English translation. You can start speaking immediately without knowing the alphabet." },
  { q: "Is this Gulf Arabic or Modern Standard Arabic?", a: "This course teaches Gulf Arabic (Khaleeji) — the dialect spoken daily in the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. We also offer a separate Fusha (MSA) course." },
  { q: "How long does it take per day?", a: "Each lesson takes 5–10 minutes. We recommend one unit per week, but you can go at your own pace. Lifetime access means no pressure." },
  { q: "Is access lifetime?", a: "Yes — one-time payment, lifetime access. No subscriptions, no recurring charges." },
  { q: "How do I get the private evaluation session (Full Bundle)?", a: "After purchasing the Full Bundle, you'll receive instructions to book a 1-on-1 session with the instructor to evaluate your speaking, answer questions, and guide your next steps." },
  { q: "What payment methods are supported?", a: "We accept PayPal and all major credit/debit cards through secure checkout." },
];

// --------------- COMPONENT ---------------

export default function GulfArabicCourse() {
  const { user } = useAuth();

  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "Gulf Arabic Course", path: "/gulf-arabic-course" },
  ]);
  const courseSchema = generateCourseSchema(
    "Gulf Arabic",
    "Learn Gulf Arabic for real life in the UAE & GCC with native audio, practical phrases, and interactive quizzes. Lifetime access.",
    "/gulf-arabic-course"
  );

  const getCtaLink = (path: string) =>
    user ? path : `/signup?redirect=${encodeURIComponent(path)}`;

  return (
    <>
      <SEOHead
        title="Gulf Arabic Course for Expats"
        description="Learn Gulf Arabic for real life in the UAE & GCC with native audio, practical phrases, and interactive quizzes. Lifetime access. PayPal checkout."
        canonicalPath="/gulf-arabic-course"
        jsonLd={[breadcrumbSchema, courseSchema]}
      />
      <Layout>
        {/* ===== HERO ===== */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.04] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Speak Gulf Arabic Confidently in{" "}
                <span className="text-gradient">Real-Life Situations</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Built for expats in the UAE & GCC — learn the phrases locals actually use, with native audio and interactive quizzes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button size="xl" variant="hero" asChild>
                  <a href="#pricing">Get Full Access</a>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/free-gulf-lesson">Try the Free Lesson</Link>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
                {trustBullets.map((b) => (
                  <span key={b.text} className="flex items-center gap-2">
                    <b.icon className="w-4 h-4 text-primary flex-shrink-0" />
                    {b.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== COURSE SCREENSHOTS ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
              See Exactly How The Course Works
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              Interactive lessons with Arabic script, transliteration, native audio, and quizzes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {screenshots.map((s, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <img
                    src={s.src}
                    alt={s.caption}
                    className="w-full aspect-video object-cover object-top"
                    loading="lazy"
                  />
                  <div className="p-4">
                    <p className="text-sm font-medium text-foreground text-center">{s.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHY THIS WORKS ===== */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
              Why This Works <span className="text-gradient">(For Expats)</span>
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              Designed around how expats actually learn and use Arabic every day.
            </p>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {whyCards.map((c) => (
                <div key={c.title} className="bg-card rounded-2xl p-7 border border-border">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5">
                    <c.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PHRASES ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
              What You'll Be Able To Say
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              Practical Gulf Arabic phrases you can use on day one.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {phrases.map((p) => (
                <div key={p.arabic} className="bg-card rounded-xl p-5 border border-border">
                  <p className="text-2xl font-semibold text-foreground mb-1 text-right" dir="rtl">
                    {p.arabic}
                  </p>
                  <p className="text-sm text-primary font-medium mb-1">{p.translit}</p>
                  <p className="text-sm text-muted-foreground">{p.english}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section id="pricing" className="py-16 md:py-20 scroll-mt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
              Choose Your Plan
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              One-time payment. Lifetime access. No subscriptions.
            </p>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Beginner */}
              <div className="bg-card rounded-2xl border border-border p-7 flex flex-col">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Beginner Course</h3>
                  <p className="text-sm text-muted-foreground mt-1">Start your Arabic journey</p>
                </div>
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold text-foreground">$14.99</span>
                  <span className="text-muted-foreground text-sm"> /one-time</span>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {beginnerFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <Link to={getCtaLink("/pricing?course=gulf")}>Get Started</Link>
                </Button>
              </div>

              {/* Full Bundle */}
              <div className="relative bg-card rounded-2xl border-2 border-secondary p-7 flex flex-col shadow-gold">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    🔥 Most Popular
                  </div>
                </div>
                <div className="text-center mb-6 pt-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Full Bundle</h3>
                  <p className="text-sm text-muted-foreground mt-1">Master Gulf Arabic completely</p>
                </div>
                <div className="text-center mb-6">
                  <span className="text-lg text-muted-foreground line-through mr-2">$79.99</span>
                  <span className="text-4xl font-bold text-foreground">$49.99</span>
                  <span className="text-muted-foreground text-sm"> /one-time</span>
                  <p className="text-sm text-secondary font-semibold mt-1">Save $30 today</p>
                </div>
                <ul className="space-y-3 mb-4 flex-1">
                  {bundleFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-center text-muted-foreground mb-4">
                  Private Evaluation Session included — <span className="font-semibold text-secondary">$30 Value</span>
                </p>
                <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" size="lg" asChild>
                  <Link to={getCtaLink("/pricing?course=gulf")}>Get Full Access</Link>
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-6">
              Secure checkout via PayPal. Instant access after purchase.
            </p>
          </div>
        </section>

        {/* ===== AFTER PURCHASE ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
              What You Get Immediately After Purchase
            </h2>
            <div className="max-w-2xl mx-auto space-y-8">
              {steps.map((s) => (
                <div key={s.num} className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {s.num}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== GUARANTEE ===== */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border p-8 md:p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                7-Day Money-Back Guarantee
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Try the course risk-free. If it's not for you, email us within 7 days for a full refund. No questions asked.
              </p>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground text-center mb-10">
                Everything you need to know before starting
              </p>
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`faq-${idx}`}
                    className="bg-card rounded-xl border border-border px-6"
                  >
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Ready to Speak Your First Real Sentence Today?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" asChild>
                  <a href="#pricing">
                    Get Full Access <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/free-gulf-lesson">Try the Free Lesson</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
