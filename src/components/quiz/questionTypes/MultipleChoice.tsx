import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { registerQuestionType, type QuestionRendererProps } from "./registry";

export function MultipleChoice({ question, answer, onAnswer }: QuestionRendererProps) {
  return (
    <>
      <div className="text-center space-y-4">
        {question.audio_url && (
          <Button
            variant="outline"
            size="lg"
            className="gap-2 mb-4"
            onClick={() => {
              const audio = new Audio(question.audio_url!);
              audio.play();
            }}
          >
            <Volume2 className="h-5 w-5" />
            Listen to Arabic
          </Button>
        )}
        <h2 className="text-2xl font-bold text-foreground">{question.prompt}</h2>
      </div>

      <div className="grid gap-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(option)}
            className={cn(
              "w-full p-4 text-left rounded-xl border-2 transition-all",
              answer === option
                ? "border-primary bg-primary/10"
                : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                  answer === option
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {String.fromCharCode(65 + index)}
              </div>
              <span className="text-foreground">{option}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

registerQuestionType("multiple_choice", MultipleChoice);
