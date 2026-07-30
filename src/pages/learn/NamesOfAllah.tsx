import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateFAQPageSchema } from "@/components/seo/SEOHead";
import { generateBreadcrumbListSchema } from "@/lib/seo/breadcrumbs";
import { DirectAnswer } from "@/components/seo/DirectAnswer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ASMA_UL_HUSNA } from "@/data/asmaUlHusna";

const CANONICAL = "/learn/99-names-of-allah";

const DIRECT_ANSWER =
  "The 99 Names of Allah (Asma ul Husna, أسماء الله الحسنى) are the attributes of God described in the Qur'an and Sunnah — such as Ar-Rahman (The Exceedingly Compassionate) and Al-Hakim (The All-Wise). Each name is a single Arabic word or short phrase, and learning them is one of the fastest ways to build classical Arabic vocabulary.";

const FAQS = [
  {
    q: "What are the 99 Names of Allah?",
    a: "The 99 Names of Allah, known in Arabic as Asma ul Husna (أسماء الله الحسنى, 'the most beautiful names'), are the attributes of God found in the Qur'an and the Sunnah. Each name describes a quality such as mercy, knowledge, power, or justice.",
  },
  {
    q: "What does Asma ul Husna mean?",
    a: "Asma ul Husna literally means 'the most beautiful names'. Asma (أسماء) is the plural of ism, 'name', and al-husna (الحسنى) means 'the most beautiful' or 'the finest'.",
  },
  {
    q: "Are all 99 names listed in the Qur'an?",
    a: "Many of the names appear directly in the Qur'an, while the specific list of 99 comes from a narration reported by At-Tirmidhi. Different scholarly traditions order and enumerate a few of the names slightly differently.",
  },
  {
    q: "How do I learn the 99 Names in Arabic?",
    a: "Study them in small groups of five to ten, read each name in Arabic script with its short vowels, say the transliteration aloud, and connect it to its English meaning. Many names share the same Arabic root patterns, so learning them also teaches you core Arabic morphology.",
  },
  {
    q: "Do I need to know Arabic to learn the 99 Names?",
    a: "No. You can start with transliteration and meanings. But reading them in Arabic script is easier than most learners expect — the Arabic alphabet takes only a few hours to learn, and our free Fusha lessons cover it step by step.",
  },
];

export default function NamesOfAllah() {
  const breadcrumbSchema = generateBreadcrumbListSchema([
    { name: "Home", path: "/" },
    { name: "99 Names of Allah", path: CANONICAL },
  ]);
  const faqSchema = generateFAQPageSchema(CANONICAL, FAQS);
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "The 99 Names of Allah (Asma ul Husna)",
    url: `https://arabiyapath.com${CANONICAL}`,
    numberOfItems: ASMA_UL_HUSNA.length,
    itemListElement: ASMA_UL_HUSNA.map((name) => ({
      "@type": "ListItem",
      position: name.n,
      name: `${name.tr} (${name.ar}) — ${name.en}`,
    })),
  };

  return (
    <>
      <SEOHead
        title="99 Names of Allah with Meaning — Asma ul Husna in Arabic & English"
        description="The complete list of the 99 Names of Allah (Asma ul Husna) in Arabic script, with transliteration and English meanings, plus how to learn and pronounce them."
        canonicalPath={CANONICAL}
        jsonLd={[breadcrumbSchema, faqSchema, itemListSchema]}
      />
      <Layout>
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-primary">Home</Link>
                <span className="mx-2">/</span>
                <span>99 Names of Allah</span>
              </nav>

              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                The <span className="text-gradient">99 Names of Allah</span> with Meaning
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Asma ul Husna — the complete list in Arabic script, transliteration, and English.
              </p>

              <div className="max-w-3xl mx-auto mb-10">
                <DirectAnswer
                  text={DIRECT_ANSWER}
                  linksTitle="Keep learning"
                  links={[
                    { href: "/learn/fusha-arabic", label: "Learn Fusha Arabic" },
                    { href: "/blog/fusha-arabic-alphabet", label: "Arabic alphabet" },
                    { href: "/flashcards", label: "Vocabulary practice" },
                    { href: "/learn/gulf-arabic", label: "Gulf Arabic" },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-4">What does Asma ul Husna mean?</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                <strong>Asma ul Husna</strong> (أسماء الله الحسنى) translates as “the most beautiful
                names”. <em>Asmāʾ</em> is the plural of <em>ism</em> (name) and <em>al-ḥusnā</em> means
                “the finest”. The names describe God’s attributes: mercy (<em>Ar-Rahman</em>), knowledge
                (<em>Al-Alim</em>), power (<em>Al-Qadir</em>), justice (<em>Al-Adl</em>), and more.
              </p>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                For Arabic learners the list is unusually useful. Almost every name is built on a
                three-letter root using a standard pattern, so working through the 99 names quietly
                teaches you how Arabic words are formed — the same patterns you meet again in everyday
                Modern Standard Arabic.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                The complete list of the 99 Names of Allah
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {ASMA_UL_HUSNA.map((name) => (
                  <div
                    key={name.n}
                    className="rounded-xl border border-border bg-card p-4 flex items-start gap-4"
                  >
                    <span className="text-xs font-semibold text-muted-foreground mt-1 w-6 shrink-0">
                      {name.n}
                    </span>
                    <div className="min-w-0">
                      <p dir="rtl" lang="ar" className="text-2xl text-foreground leading-relaxed">
                        {name.ar}
                      </p>
                      <p className="font-semibold text-foreground">{name.tr}</p>
                      <p className="text-sm text-muted-foreground">{name.en}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                How to memorise the 99 Names
              </h2>
              <ol className="list-decimal pl-5 space-y-3 text-muted-foreground leading-relaxed">
                <li>
                  <strong>Learn the Arabic script first.</strong> Reading the names as they are written
                  fixes the pronunciation far better than transliteration alone.
                </li>
                <li>
                  <strong>Work in groups of five.</strong> Recite each group aloud until it is
                  effortless before adding the next.
                </li>
                <li>
                  <strong>Notice the patterns.</strong> Names like <em>Al-Ghafur</em>, <em>Ash-Shakur</em>{" "}
                  and <em>As-Sabur</em> share one intensive pattern; <em>Al-Khaliq</em>,{" "}
                  <em>Al-Qabid</em> and <em>Al-Basit</em> share another.
                </li>
                <li>
                  <strong>Review with spaced repetition.</strong> Short daily reviews beat long weekly
                  sessions — this is exactly how our vocabulary units are built.
                </li>
                <li>
                  <strong>Say them, don’t just read them.</strong> Speaking each name out loud trains the
                  sounds that do not exist in English, such as ʿayn (ع) and ḥāʾ (ح).
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Frequently asked questions
              </h2>
              <div className="space-y-6">
                {FAQS.map((faq) => (
                  <div key={faq.q}>
                    <h3 className="font-semibold text-foreground mb-1">{faq.q}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Read these names in Arabic — for real
              </h2>
              <p className="text-muted-foreground mb-6">
                Our free Fusha lessons take you from the alphabet to reading full sentences, with native
                audio at every step.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero" className="w-full sm:w-auto" asChild>
                  <Link to="/learn/fusha-arabic">
                    Start with Fusha Arabic <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/blog/fusha-arabic-alphabet">Learn the Arabic alphabet</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
