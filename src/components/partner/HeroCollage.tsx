import learnAsset from "@/assets/partner/learn-bus.jpg.asset.json";
import dashboardAsset from "@/assets/partner/dashboard.png.asset.json";
import speakingAsset from "@/assets/partner/speaking.jpg.asset.json";
import quizAsset from "@/assets/partner/quiz-traffic.jpg.asset.json";
import { Volume2, Sparkles } from "lucide-react";

/**
 * Hero composition: one dominant product screenshot surrounded by
 * three smaller floating cards. Designed to feel like a premium SaaS
 * product shot (Linear / Stripe / Framer).
 */
export function HeroCollage() {
  return (
    <div className="relative w-full max-w-[620px] mx-auto aspect-[5/6] sm:aspect-[6/6] lg:aspect-[6/6.2]">
      {/* Ambient glows */}
      <div className="absolute -inset-10 -z-10 bg-gradient-to-br from-primary/35 via-secondary/20 to-transparent blur-[80px] rounded-[45%] opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[80%] aspect-square rounded-full bg-secondary/15 blur-[100px]" />

      {/* DOMINANT card — Learn / Bus flashcard */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] sm:w-[72%] rounded-[28px] overflow-hidden border border-white/20 bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[28px] pointer-events-none" />
        <img
          src={learnAsset.url}
          alt="ArabiyaPath flashcard for the Arabic word for bus with native audio"
          loading="eager"
          fetchPriority="high"
          className="block w-full h-auto"
        />
      </div>

      {/* Floating — Dashboard (top right) */}
      <div className="absolute -top-2 right-0 sm:right-2 w-[46%] sm:w-[42%] rounded-2xl overflow-hidden border border-white/20 bg-card shadow-2xl rotate-[6deg] hover:rotate-[3deg] transition-transform duration-500">
        <img
          src={dashboardAsset.url}
          alt="Dashboard with streak and mastered cards"
          loading="lazy"
          className="block w-full h-auto"
        />
      </div>

      {/* Floating — Quiz (bottom right) */}
      <div className="absolute bottom-0 right-[-2%] sm:right-[2%] w-[44%] sm:w-[40%] rounded-2xl overflow-hidden border border-white/20 bg-card shadow-2xl rotate-[5deg] hover:rotate-[2deg] transition-transform duration-500">
        <img
          src={quizAsset.url}
          alt="Interactive quiz with correct-answer feedback"
          loading="lazy"
          className="block w-full h-auto"
        />
      </div>

      {/* Floating — Speaking (bottom left) */}
      <div className="absolute bottom-[6%] left-[-2%] sm:left-[0%] w-[42%] sm:w-[38%] rounded-2xl overflow-hidden border border-white/20 bg-card shadow-2xl -rotate-[7deg] hover:-rotate-[3deg] transition-transform duration-500 hidden sm:block">
        <img
          src={speakingAsset.url}
          alt="Speaking practice with record and listen"
          loading="lazy"
          className="block w-full h-auto"
        />
      </div>

      {/* Floating chip — Native audio */}
      <div className="absolute top-[12%] left-[-4%] sm:left-[-2%] inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-card/90 backdrop-blur-xl border border-border shadow-xl text-xs font-semibold animate-fade-in">
        <span className="w-7 h-7 rounded-xl bg-primary/15 flex items-center justify-center">
          <Volume2 className="w-3.5 h-3.5 text-primary" />
        </span>
        Native audio
      </div>

      {/* Floating chip — Lifetime access */}
      <div className="absolute bottom-[34%] right-[-4%] sm:right-[-2%] inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-card/90 backdrop-blur-xl border border-border shadow-xl text-xs font-semibold animate-fade-in">
        <span className="w-7 h-7 rounded-xl bg-secondary/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-secondary" />
        </span>
        Lifetime access
      </div>
    </div>
  );
}
