import onroadAsset from "@/assets/partner/onroad-modes.jpg.asset.json";
import learnAsset from "@/assets/partner/learn-bus.jpg.asset.json";
import speakingAsset from "@/assets/partner/speaking.jpg.asset.json";
import quizAsset from "@/assets/partner/quiz-traffic.jpg.asset.json";

/**
 * Layered collage of real product screenshots used in the hero.
 * Pure CSS layering — no generated illustrations.
 */
export function HeroCollage() {
  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-[5/5] lg:aspect-[5/6] max-w-[560px] mx-auto">
      {/* Ambient glow */}
      <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-primary/25 via-secondary/15 to-transparent blur-3xl rounded-[40%]" />

      {/* Back card — On The Road overview */}
      <div className="absolute top-0 right-0 w-[72%] rounded-2xl overflow-hidden border border-border bg-card shadow-2xl rotate-[4deg] origin-top-right">
        <img
          src={onroadAsset.url}
          alt="ArabiyaPath unit overview with four learning modes"
          loading="eager"
          className="block w-full h-auto"
        />
      </div>

      {/* Mid card — Speaking */}
      <div className="absolute top-[20%] left-0 w-[58%] rounded-2xl overflow-hidden border border-border bg-card shadow-2xl -rotate-[5deg]">
        <img
          src={speakingAsset.url}
          alt="Speaking practice: record yourself and listen to native audio"
          loading="lazy"
          className="block w-full h-auto"
        />
      </div>

      {/* Front card — Learn / flashcard */}
      <div className="absolute bottom-0 right-[6%] w-[62%] rounded-2xl overflow-hidden border border-border bg-card shadow-2xl rotate-[2deg]">
        <img
          src={learnAsset.url}
          alt="Flashcard with realistic image and native audio"
          loading="lazy"
          className="block w-full h-auto"
        />
      </div>

      {/* Floating chip — quiz feedback */}
      <div className="absolute -bottom-3 left-[2%] w-[44%] rounded-xl overflow-hidden border border-border bg-card shadow-xl -rotate-[3deg] hidden sm:block">
        <img
          src={quizAsset.url}
          alt="Quiz with correct-answer feedback"
          loading="lazy"
          className="block w-full h-auto"
        />
      </div>
    </div>
  );
}
