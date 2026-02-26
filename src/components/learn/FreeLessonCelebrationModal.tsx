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

export function FreeLessonCelebrationModal({
  open,
  onOpenChange,
  nextLessonId,
  dialectId,
  onContinueToNext,
}: FreeLessonCelebrationModalProps) {
  const [phase, setPhase] = useState<"celebrate" | "upgrade">("celebrate");

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
        ) : (
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
                  to={`/signup?redirect=${encodeURIComponent(`/checkout?dialectId=${dialectId}`)}`}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
