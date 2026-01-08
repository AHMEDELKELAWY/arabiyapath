import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuiz, useSubmitQuiz } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
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
  Volume2,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useQuiz(quizId);
  const submitQuiz = useSubmitQuiz();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-3xl py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!data || !user) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Quiz not available</h1>
          <Button asChild className="mt-6">
            <Link to="/dialects">Browse Dialects</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const { quiz, questions, unit, level, dialect } = data;
  const totalQuestions = questions.length;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
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

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correct_answer) {
        correct++;
      }
    });
    return Math.round((correct / totalQuestions) * 100);
  };

  const handleSubmit = async () => {
    const score = calculateScore();
    const passed = score >= 70;

    try {
      await submitQuiz.mutateAsync({ quizId: quizId!, score, passed });
      setSubmitted(true);
      setShowResults(true);
    } catch (error) {
      toast.error("Failed to submit quiz");
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setSubmitted(false);
  };

  const allAnswered = Object.keys(answers).length === totalQuestions;
  const score = calculateScore();
  const passed = score >= 70;

  // Results Screen
  if (showResults) {
    return (
      <Layout>
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
                {passed && (
                  <div className="flex items-center justify-center gap-2 mt-4 p-3 bg-primary/10 rounded-lg">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-primary font-medium">Certificate Earned!</span>
                  </div>
                )}
              </div>

              <div className="py-6">
                <div className="text-6xl font-bold text-foreground">{score}%</div>
                <p className="text-muted-foreground">
                  {Object.values(answers).filter((a, i) => a === questions[i].correct_answer).length} of {totalQuestions} correct
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

              {/* Answer Review */}
              <div className="pt-6 border-t text-left">
                <h3 className="font-semibold mb-4">Answer Review</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {questions.map((q, index) => {
                    const isCorrect = answers[index] === q.correct_answer;
                    return (
                      <div 
                        key={index}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          isCorrect ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {isCorrect ? (
                            <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{q.prompt}</p>
                            {!isCorrect && (
                              <p className="text-muted-foreground mt-1">
                                Correct: {q.correct_answer}
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
      </Layout>
    );
  }

  // Quiz Screen
  return (
    <Layout>
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
              {/* Question */}
              <div className="text-center space-y-4">
                {/* Audio play button for listening comprehension */}
                {question.audio_url && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 mb-4"
                    onClick={() => {
                      const audio = new Audio(question.audio_url);
                      audio.play();
                    }}
                  >
                    <Volume2 className="h-5 w-5" />
                    Listen to Arabic
                  </Button>
                )}
                <h2 className="text-2xl font-bold text-foreground">
                  {question.prompt}
                </h2>
              </div>

              {/* Options */}
              <div className="grid gap-3">
                {question.options.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option)}
                    className={cn(
                      "w-full p-4 text-left rounded-xl border-2 transition-all",
                      answers[currentQuestion] === option
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                        answers[currentQuestion] === option
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-foreground">{option}</span>
                    </div>
                  </button>
                ))}
              </div>

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
    </Layout>
  );
}
