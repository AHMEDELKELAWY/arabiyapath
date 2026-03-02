import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

interface FreeLessonCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextLessonId?: string | null;
  dialectId?: string;
  onContinueToNext: () => void;
}

const GULF_DIALECT_ID = "d4e5f6a7-0000-0000-0000-000000000001";

export function FreeLessonCelebrationModal({
  open,
  onOpenChange,
  nextLessonId,
  dialectId,
  onContinueToNext,
}: FreeLessonCelebrationModalProps) {
  const [phase, setPhase] = useState<"celebrate" | "upgrade">("celebrate");
  const isGulf = dialectId === GULF_DIALECT_ID;

  useEffect(() => {
    if (open) {
      setPhase("celebrate");
      const timer = setTimeout(() => setPhase("upgrade"), 2200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center p-8 gap-0 [&>button]:hidden">
        {phase === "celebrate" ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Lesson Complete! 🎉</h2>
            <p className="text-muted-foreground">
              Amazing work — you just learned real Arabic!
            </p>
          </div>
        ) : isGulf ? (
          <GulfUpgrade
            nextLessonId={nextLessonId}
            onOpenChange={onOpenChange}
            onContinueToNext={onContinueToNext}
          />
        ) : (
          <DefaultUpgrade
            dialectId={dialectId}
            nextLessonId={nextLessonId}
            onOpenChange={onOpenChange}
            onContinueToNext={onContinueToNext}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Gulf-specific upgrade panel ── */
function GulfUpgrade({
  nextLessonId,
  onOpenChange,
  onContinueToNext,
}: {
  nextLessonId?: string | null;
  onOpenChange: (open: boolean) => void;
  onContinueToNext: () => void;
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Sparkles className="w-10 h-10 text-primary mx-auto" />
      <h2 className="text-xl font-bold text-foreground">
        You Just Took the First Step 🚀
      </h2>
      <p className="text-sm font-medium text-muted-foreground">
        Lesson 1 of 150 completed.
      </p>
      <p className="text-sm text-muted-foreground">
        Imagine holding real conversations confidently across the UAE &amp; GCC.
        Don't stop at one sentence — build real speaking confidence.
      </p>

      <div className="flex flex-col items-start gap-2 text-left mx-auto max-w-xs">
        {[
          "150+ structured step-by-step lessons",
          "Real-life Gulf dialogues",
          "Interactive quizzes & certificates",
          "Lifetime access",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">{item}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <Button asChild size="lg" variant="hero" className="w-full gap-2">
          <Link to="/gulf-arabic-course#choose-plan">
            Choose Your Plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <p className="text-xs text-muted-foreground">
          One-time payment. Lifetime access. Start today.
        </p>

        {nextLessonId && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              onOpenChange(false);
              onContinueToNext();
            }}
          >
            Continue free lesson →
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Default upgrade panel (non-Gulf) ── */
function DefaultUpgrade({
  dialectId,
  nextLessonId,
  onOpenChange,
  onContinueToNext,
}: {
  dialectId?: string;
  nextLessonId?: string | null;
  onOpenChange: (open: boolean) => void;
  onContinueToNext: () => void;
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Sparkles className="w-10 h-10 text-primary mx-auto" />
      <h2 className="text-xl font-bold text-foreground">
        Keep the momentum going!
      </h2>
      <p className="text-sm text-muted-foreground">
        You've just tasted what real Arabic sounds like. Unlock the full course to go from zero to confident speaker.
      </p>

      <div className="flex flex-col items-start gap-2 text-left mx-auto max-w-xs">
        {[
          "150+ structured lessons",
          "Quizzes & certificates",
          "1 Private Evaluation Session (Bundle)",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">{item}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <Button asChild size="lg" className="w-full gap-2">
          <Link
            to={`/signup?redirect=${encodeURIComponent(`/choose-plan/${dialectId}`)}`}
          >
            Continue My Arabic Journey
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        {nextLessonId && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              onOpenChange(false);
              onContinueToNext();
            }}
          >
            Continue free lesson →
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Create your free account to unlock the full course.
      </p>
    </div>
  );
}
