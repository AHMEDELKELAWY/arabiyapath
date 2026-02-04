import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, generateOrganizationSchema } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { FlashCardDeck } from "@/components/flashcards/FlashCardDeck";
import { LevelProgress } from "@/components/flashcards/LevelProgress";
import { FlashCardAI } from "@/components/flashcards/FlashCardAI";
import { LeadCaptureModal } from "@/components/flashcards/LeadCaptureModal";
import {
  flashCards,
  flashCardLevels,
  getCardsByLevel,
} from "@/data/flashCardsData";
import { ArrowRight, BookOpen, Brain, Globe, Target } from "lucide-react";

const STORAGE_KEY = "arabiyapath-flashcards-progress";
const EMAIL_KEY = "arabiyapath-flashcards-email";

export default function FlashCards() {
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [reviewedCards, setReviewedCards] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [aiQuestionCount, setAiQuestionCount] = useState(0);

  // Load saved progress
  useEffect(() => {
    const savedProgress = localStorage.getItem(STORAGE_KEY);
    const savedEmail = localStorage.getItem(EMAIL_KEY);

    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setReviewedCards(new Set(parsed.reviewedCards || []));
        setProgress(parsed.progress || {});
      } catch (e) {
        console.error("Failed to parse saved progress");
      }
    }

    if (savedEmail) {
      setUserEmail(savedEmail);
    }
  }, []);

  // Save progress
  useEffect(() => {
    const data = {
      reviewedCards: Array.from(reviewedCards),
      progress,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [reviewedCards, progress]);

  const currentCards = getCardsByLevel(currentLevel);
  const currentCard = currentCards.length > 0 ? currentCards[0] : null;

  const handleCardReviewed = (cardId: string) => {
    setReviewedCards((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      return next;
    });

    // Update level progress
    const card = flashCards.find((c) => c.id === cardId);
    if (card) {
      setProgress((prev) => ({
        ...prev,
        [card.level]: (prev[card.level] || 0) + 1,
      }));
    }
  };

  const handleEmailSubmit = (email: string) => {
    setUserEmail(email);
    localStorage.setItem(EMAIL_KEY, email);
    setShowEmailModal(false);
    setAiQuestionCount(0);
  };

  const handleNeedEmail = () => {
    setShowEmailModal(true);
  };

  const handleAiQuestionAsked = () => {
    setAiQuestionCount((prev) => prev + 1);
  };

  // JSON-LD Schema
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: "Gulf Arabic Flash Cards for Business Professionals",
    description:
      "AI-powered flash cards teaching advanced Gulf Arabic for executives, investors, and professionals working in the UAE, Saudi Arabia, and other Gulf countries.",
    provider: {
      "@type": "Organization",
      name: "ArabiyaPath",
      url: "https://arabiyapath.com",
    },
    educationalLevel: "Advanced",
    inLanguage: ["ar", "en"],
    learningResourceType: "Flash Cards",
    teaches: "Gulf Arabic (Khaleeji) for Business",
    audience: {
      "@type": "Audience",
      audienceType: "Business Professionals, Executives, Expats",
    },
  };

  return (
    <Layout>
      <SEOHead
        title="Gulf Arabic Flash Cards for Executives"
        description="Master advanced Gulf Arabic for business and social influence. AI-powered flash cards with cultural insights, audio pronunciation, and level-based progression for professionals."
        canonicalPath="/flash-cards"
        jsonLd={[pageSchema, generateOrganizationSchema()]}
      />

      {/* Hero Section - SEO-optimized intro */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
              AI-Powered Learning
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Gulf Arabic Flash Cards for{" "}
              <span className="text-primary">Business Professionals</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Master the advanced Arabic phrases that executives, investors, and
              high-status professionals use in the Gulf. Level-based learning
              with AI cultural coaching and native audio pronunciation.
            </p>

            {/* Value props */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: BookOpen, text: "24 Expert Phrases" },
                { icon: Brain, text: "AI Cultural Advisor" },
                { icon: Globe, text: "Native Audio" },
                { icon: Target, text: "3 Skill Levels" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border border-border/50"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Flash Cards Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar - Level Progress */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="sticky top-24 space-y-6">
                <LevelProgress
                  levels={flashCardLevels}
                  currentLevel={currentLevel}
                  progress={progress}
                  onSelectLevel={setCurrentLevel}
                />

                {/* AI Assistant */}
                <FlashCardAI
                  currentCard={currentCard}
                  onNeedEmail={handleNeedEmail}
                  hasEmail={!!userEmail}
                  questionCount={aiQuestionCount}
                  onQuestionAsked={handleAiQuestionAsked}
                />
              </div>
            </div>

            {/* Main Card Area */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Level {currentLevel}:{" "}
                  {flashCardLevels.find((l) => l.level === currentLevel)?.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {
                    flashCardLevels.find((l) => l.level === currentLevel)
                      ?.description
                  }
                </p>
              </div>

              <FlashCardDeck
                cards={currentCards}
                onCardReviewed={handleCardReviewed}
                reviewedCards={reviewedCards}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Why Learn Gulf Arabic for Business?
            </h2>
            <div className="prose prose-sm text-muted-foreground space-y-4">
              <p>
                In the Gulf region—UAE, Saudi Arabia, Qatar, Kuwait, Bahrain,
                and Oman—business relationships are built on trust, respect, and
                cultural understanding. Speaking Gulf Arabic (Khaleeji) isn't
                just about communication; it's about demonstrating commitment to
                the region and its people.
              </p>
              <p>
                These flash cards focus on the advanced phrases that
                high-status professionals use: from welcoming dignitaries to
                navigating delicate negotiations. Each phrase includes cultural
                context that explains not just what to say, but when and how to
                say it for maximum impact.
              </p>
              <h3 className="text-lg font-semibold text-foreground mt-6">
                What Makes This Different
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Executive-level content:</strong> Phrases used in
                  boardrooms, royal audiences, and elite social circles
                </li>
                <li>
                  <strong>AI Cultural Advisor:</strong> Ask questions about
                  appropriateness, alternatives, and consequences
                </li>
                <li>
                  <strong>Native audio pronunciation:</strong> Hear each phrase
                  spoken with proper Gulf accent
                </li>
                <li>
                  <strong>Progressive difficulty:</strong> Build from
                  professional foundation to high-society mastery
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Knowing the words is step one.
              <br />
              <span className="text-primary">
                Knowing when and how to use them is mastery.
              </span>
            </h2>
            <p className="text-muted-foreground mb-8">
              Ready to go deeper? Our full Gulf Arabic course provides
              structured learning with certificates recognized by employers
              across the region.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link to="/learn/gulf-arabic">
                Master Gulf Arabic for Business & Social Influence
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailSubmit}
      />
    </Layout>
  );
}
