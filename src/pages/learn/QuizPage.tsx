import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuiz, useSubmitQuiz, QuizSubmitResult } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Trophy,
  RotateCcw,
  Home,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { getRenderer } from "@/components/quiz/questionTypes";

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // useQuiz is called below with attemptSeed.
  const submitQuiz = useSubmitQuiz();
  const { playSound } = useSoundEffects();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  // Keyed by question ID from the server-selected subset.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmitResult | null>(null);
  const [attemptSeed, setAttemptSeed] = useState(() => Date.now());

  // Server serves a random subset per attempt; attemptSeed forces refetch on retry.
  const { data, isLoading } = useQuiz(quizId, attemptSeed);
  const questions = data?.questions ?? [];

  if (isLoading) {
    return (
      <FocusLayout backTo={`/learn/unit/${undefined}`}>
        <div className="container max-w-3xl py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </FocusLayout>
    );
  }

  if (!data || !user) {
    return (
      <FocusLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Quiz not available</h1>
          <Button asChild className="mt-6">
            <Link to="/dialects">Browse Dialects</Link>
          </Button>
        </div>
      </FocusLayout>
    );
  }

  const { quiz, unit, level, dialect } = data;
  const totalQuestions = questions.length;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleAnswer = (answer: string) => {
    if (!question) return;
    setAnswers(prev => ({ ...prev, [question.id]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Answers are keyed by question ID; server scores against the served subset.
      const result = await submitQuiz.mutateAsync({ quizId: quizId!, answers });
      setQuizResult(result);
      setShowResults(true);
      
      // Play appropriate sound based on score
      if (result.score >= 90) {
        playSound('quizSuccess'); // High score celebration
      } else if (result.passed) {
        playSound('lessonComplete'); // Regular pass
      } else {
        playSound('quizFail'); // Encouragement to try again
      }
    } catch (error) {
      toast.error("Failed to submit quiz");
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setQuizResult(null);
    setAttemptSeed(Date.now());
  };

  const allAnswered = Object.keys(answers).length === totalQuestions;

  // Results Screen
  if (showResults && quizResult) {
    const { score, passed, correctCount, results, certificateAwarded } = quizResult;
    
    return (
      <FocusLayout backTo={`/learn/unit/${unit?.id}`}>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center py-12">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="p-8 text-center space-y-6">
              <div className={cn(
                "w-24 h-24 rounded-full mx-auto flex items-center justify-center",
                passed ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
              )}>
                {passed ? (
                  <Trophy className="h-12 w-12 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-12 w-12 text-red-600 dark:text-red-400" />
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {passed ? "Congratulations!" : "Keep Practicing!"}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {passed 
                    ? "You've passed the quiz and completed this unit!"
                    : "You need 70% to pass. Review the lessons and try again."}
                </p>
                {certificateAwarded && (
                  <div className="flex items-center justify-center gap-2 mt-4 p-3 bg-primary/10 rounded-lg">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-primary font-medium">Level Certificate Earned!</span>
                  </div>
                )}
              </div>

              <div className="py-6">
                <div className="text-6xl font-bold text-foreground">{score}%</div>
                <p className="text-muted-foreground">
                  {correctCount} of {totalQuestions} correct
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {!passed && (
                  <Button size="lg" onClick={handleRetry} className="gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Try Again
                  </Button>
                )}
                <Button 
                  size="lg" 
                  variant={passed ? "default" : "outline"}
                  onClick={() => navigate(`/learn/unit/${unit?.id}`)}
                  className="gap-2"
                >
                  <Home className="h-5 w-5" />
                  Back to Unit
                </Button>
                {passed && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate(`/learn/level/${level?.id}`)}
                  >
                    Continue to Next Unit
                  </Button>
                )}
              </div>

              {/* Answer Review - now with correct answers from server */}
              <div className="pt-6 border-t text-left">
                <h3 className="font-semibold mb-4">Answer Review</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {questions.map((q, index) => {
                    const result = quizResult.idResults?.find((r) => r.questionId === q.id);
                    return (
                      <div 
                        key={index}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          result?.correct ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {result?.correct ? (
                            <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{q.prompt}</p>
                            {!result?.correct && result?.correctAnswer && (
                              <p className="text-muted-foreground mt-1">
                                Correct: {result.correctAnswer}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </FocusLayout>
    );
  }

  // Quiz Screen
  return (
    <FocusLayout backTo={`/learn/unit/${unit?.id}`}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-3xl py-4">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/learn/unit/${unit?.id}`)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Exit Quiz
              </Button>
              <span className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {totalQuestions}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="container max-w-3xl py-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 space-y-8">
              {(() => {
                const Renderer = getRenderer(question.question_type);
                if (!Renderer) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      This question type ({question.question_type}) is not yet supported in this
                      version of the app. Please update to continue.
                    </div>
                  );
                }
                return (
                  <Renderer
                    question={question}
                    answer={answers[question.id]}
                    onAnswer={handleAnswer}
                  />
                );
              })()}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentQuestion === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Previous
                </Button>

                {currentQuestion === totalQuestions - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitQuiz.isPending}
                    className="gap-2 px-8"
                  >
                    {submitQuiz.isPending ? "Submitting..." : "Submit Quiz"}
                    <Check className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!answers[currentQuestion]}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Question Dots */}
              <div className="flex justify-center gap-2 pt-4">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      index === currentQuestion
                        ? "bg-primary scale-125"
                        : answers[index]
                        ? "bg-primary/50"
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FocusLayout>
  );
}
