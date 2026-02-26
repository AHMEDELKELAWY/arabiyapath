import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLesson, useMarkLessonComplete } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/hooks/usePurchases";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Volume2, 
  Check, 
  CheckCircle,
  CheckCircle2,
  List,
  X,
  Lock,
  ShoppingCart,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isFreeTrial } from "@/lib/accessControl";
import { useSoundEffects } from "@/hooks/useSoundEffects";

export default function LessonPlayer() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useLesson(lessonId);
  const { checkLevelAccess, isLoading: purchasesLoading } = usePurchases();
  const markComplete = useMarkLessonComplete();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLessonList, setShowLessonList] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { playSound } = useSoundEffects();

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Check if this is free trial content
  const levelOrderIndex = data?.level?.order_index || 0;
  const unitOrderIndex = data?.unit?.order_index || 0;
  const isFreeTrialContent = isFreeTrial(levelOrderIndex, unitOrderIndex);
  
  // Check access: free trial OR logged in with purchase
  const hasPurchaseAccess = user ? checkLevelAccess(
    data?.level?.id || '',
    data?.dialect?.id || '',
    levelOrderIndex,
    unitOrderIndex
  ) : false;
  
  const canAccess = isFreeTrialContent || hasPurchaseAccess;

  const handleMarkComplete = async () => {
    if (!user) {
      if (isFreeTrialContent) {
        // For free trial, show encouraging message and navigate to next lesson
        toast.info("Create a free account to save your progress!", {
          description: "Sign up to track your learning journey",
          action: {
            label: "Sign Up",
            onClick: () => navigate("/signup"),
          },
        });
        // Still allow navigation to next lesson in free trial
        if (data?.nextLesson) {
          playSound('lessonTransition');
          navigate(`/learn/lesson/${data.nextLesson.id}`);
        }
        return;
      }
      toast.error("Please log in to track progress");
      navigate("/login");
      return;
    }
    
    try {
      await markComplete.mutateAsync(lessonId!);
      playSound('lessonComplete');
      toast.success("Lesson marked as complete!");
      
      // Navigate to next lesson if available
      if (data?.nextLesson) {
        playSound('lessonTransition');
        navigate(`/learn/lesson/${data.nextLesson.id}`);
      }
    } catch (error) {
      toast.error("Failed to mark lesson as complete");
    }
  };

  if (isLoading || purchasesLoading) {
    return (
      <FocusLayout>
        <div className="container max-w-4xl py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </FocusLayout>
    );
  }

  if (!data) {
    return (
      <FocusLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Lesson not found</h1>
          <p className="text-muted-foreground mt-2">This lesson doesn't exist or has been removed.</p>
          <Button asChild className="mt-6">
            <Link to="/dialects">Browse Dialects</Link>
          </Button>
        </div>
      </FocusLayout>
    );
  }

  // Redirect if user doesn't have access
  if (!canAccess) {
    return (
      <FocusLayout>
        <div className="container py-16 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Required</h1>
          {!user ? (
            <>
              <p className="text-muted-foreground mt-2">Please log in or sign up to access this lesson.</p>
              <div className="flex gap-4 justify-center mt-6">
                <Button asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/signup">Sign Up Free</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mt-2">
                This lesson is part of {data?.level?.name}. Purchase to unlock access.
              </p>
              <Button asChild className="mt-6 gap-2">
                <Link to={`/checkout?levelId=${data?.level?.id}&dialectId=${data?.dialect?.id}`}>
                  <ShoppingCart className="h-4 w-4" />
                  Purchase Now
                </Link>
              </Button>
            </>
          )}
        </div>
      </FocusLayout>
    );
  }

  const { lesson, unit, level, dialect, unitLessons, prevLesson, nextLesson, isCompleted, completedCount, totalCount } = data;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <FocusLayout backTo={`/learn/unit/${unit?.id}`}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header with breadcrumb and progress */}
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-6xl py-3 sm:py-4 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              {/* Full breadcrumb - Desktop */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Link to={`/learn/dialect/${dialect?.id}`} className="hover:text-foreground transition-colors">
                  {dialect?.name}
                </Link>
                <span>/</span>
                <Link to={`/learn/level/${level?.id}`} className="hover:text-foreground transition-colors">
                  {level?.name}
                </Link>
                <span>/</span>
                <Link to={`/learn/unit/${unit?.id}`} className="hover:text-foreground transition-colors">
                  {unit?.title}
                </Link>
              </div>
              {/* Short breadcrumb - Mobile */}
              <Link 
                to={`/learn/unit/${unit?.id}`} 
                className="sm:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                {unit?.title}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLessonList(!showLessonList)}
                className="gap-1 sm:gap-2 px-2 sm:px-3"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lessons</span>
              </Button>
            </div>
            
            <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
              <Progress value={progressPercent} className="flex-1 h-1.5 sm:h-2" />
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl py-4 sm:py-8 px-4 sm:px-6">
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1 space-y-4 sm:space-y-6">
              {/* Lesson Title */}
              <div className="text-center">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">
                  {lesson.title}
                </h1>
                {isCompleted && (
                  <div className="inline-flex items-center gap-1 mt-1 sm:mt-2 text-xs sm:text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    Completed
                  </div>
                )}
              </div>

              {/* Context Image */}
              <Card className="overflow-hidden border-0 shadow-xl">
                <div className="aspect-video relative bg-muted">
                  {lesson.image_url ? (
                    <img
                      src={lesson.image_url}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Volume2 className="h-16 w-16" />
                    </div>
                  )}
                </div>
              </Card>

              {/* Arabic Text & Transliteration */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
                <CardContent className="p-4 sm:p-8 text-center space-y-4 sm:space-y-6">
                  {/* Arabic Script */}
                  <div 
                    className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-arabic leading-relaxed text-foreground"
                    dir="rtl"
                    style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                  >
                    {lesson.arabic_text}
                  </div>
                  
                  {/* Transliteration */}
                  <div className="text-base sm:text-xl md:text-2xl text-muted-foreground italic">
                    {lesson.transliteration}
                  </div>

                  {/* Audio Player */}
                  <div className="pt-2 sm:pt-4">
                    <audio
                      ref={audioRef}
                      src={lesson.audio_url || undefined}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handlePlayPause}
                      className="gap-2 sm:gap-3 px-4 sm:px-8 py-3 sm:py-6 text-sm sm:text-lg rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-all"
                      disabled={!lesson.audio_url}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                          <span className="hidden sm:inline">Pause Audio</span>
                          <span className="sm:hidden">Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                          <span className="hidden sm:inline">Play Audio</span>
                          <span className="sm:hidden">Play</span>
                        </>
                      )}
                    </Button>
                    {!lesson.audio_url && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">Audio coming soon</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                {/* Main Action Button - Top on mobile */}
                <div className="order-first sm:order-none w-full sm:w-auto">
                  {!isCompleted ? (
                    <Button
                      size="lg"
                      onClick={handleMarkComplete}
                      disabled={markComplete.isPending}
                      className="gap-2 w-full sm:w-auto px-6 sm:px-8 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      {markComplete.isPending ? "Saving..." : "Mark as Complete"}
                    </Button>
                  ) : nextLesson ? (
                    <Button
                      size="lg"
                      onClick={() => navigate(`/learn/lesson/${nextLesson.id}`)}
                      className="gap-2 w-full sm:w-auto px-6 sm:px-8"
                    >
                      Next Lesson
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => navigate(`/learn/unit/${unit?.id}`)}
                      className="gap-2 w-full sm:w-auto px-6 sm:px-8"
                    >
                      Take Quiz
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  )}
                </div>

                {/* Prev & Next - Row on mobile */}
                <div className="flex items-center gap-2 sm:contents order-last sm:order-none">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => prevLesson && navigate(`/learn/lesson/${prevLesson.id}`)}
                    disabled={!prevLesson}
                    className="flex-1 sm:flex-none gap-1 sm:gap-2 sm:order-first"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => nextLesson && navigate(`/learn/lesson/${nextLesson.id}`)}
                    disabled={!nextLesson}
                    className="flex-1 sm:flex-none gap-1 sm:gap-2 sm:order-last"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>

              {/* Free Trial Upgrade CTA */}
              {isFreeTrialContent && (
                <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 border border-primary/30 rounded-2xl p-8 sm:p-10 text-center shadow-lg">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-4" />
                  
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    You Just Spoke Your First Gulf Arabic Sentence 🎉
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg mb-6">
                    Now imagine doing this confidently in real conversations.
                  </p>

                  <div className="flex flex-col items-start gap-3 max-w-sm mx-auto mb-6 text-left">
                    {[
                      "150+ step-by-step lessons",
                      "Real-life dialogues used in the UAE & GCC",
                      "Structured path from zero to confident speaker",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm sm:text-base text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-muted-foreground text-sm sm:text-base mb-8">
                    Don't stop after lesson one.{" "}
                    <span className="font-semibold text-foreground">Build real speaking confidence.</span>
                  </p>

                  <Button
                    asChild
                    size="xl"
                    variant="hero"
                    className="gap-2"
                  >
                    <Link to={`/checkout?dialectId=${dialect?.id}`}>
                      Continue My Arabic Journey
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>

                  <p className="text-xs text-muted-foreground mt-4">
                    Instant lifetime access.
                  </p>
                </div>
              )}
            </div>

            {/* Lesson List Sidebar (Desktop) */}
            <div className={cn(
              "hidden lg:block w-72 shrink-0",
              showLessonList && "lg:block"
            )}>
              <Card className="sticky top-32">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Unit Lessons</h3>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1">
                      {unitLessons.map((l, index) => (
                        <Link
                          key={l.id}
                          to={`/learn/lesson/${l.id}`}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                            l.id === lessonId
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                            l.completed
                              ? "bg-green-600 text-white"
                              : l.id === lessonId
                              ? "bg-primary-foreground text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {l.completed ? <Check className="h-3 w-3" /> : index + 1}
                          </div>
                          <span className="text-sm truncate">{l.title}</span>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile Lesson List Overlay */}
        {showLessonList && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
            <div className="container py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Unit Lessons</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowLessonList(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-100px)]">
                <div className="space-y-2">
                  {unitLessons.map((l, index) => (
                    <Link
                      key={l.id}
                      to={`/learn/lesson/${l.id}`}
                      onClick={() => setShowLessonList(false)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg transition-colors",
                        l.id === lessonId
                          ? "bg-primary text-primary-foreground"
                          : "bg-card hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                        l.completed
                          ? "bg-green-600 text-white"
                          : l.id === lessonId
                          ? "bg-primary-foreground text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {l.completed ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <span className="truncate">{l.title}</span>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </FocusLayout>
  );
}
