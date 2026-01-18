import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useLesson, useMarkLessonComplete } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/hooks/usePurchases";
import { Layout } from "@/components/layout/Layout";
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
  List,
  X,
  Lock,
  ShoppingCart
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
      <Layout>
        <div className="container max-w-4xl py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Lesson not found</h1>
          <p className="text-muted-foreground mt-2">This lesson doesn't exist or has been removed.</p>
          <Button asChild className="mt-6">
            <Link to="/dialects">Browse Dialects</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // Redirect if user doesn't have access
  if (!canAccess) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  const { lesson, unit, level, dialect, unitLessons, prevLesson, nextLesson, isCompleted, completedCount, totalCount } = data;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header with breadcrumb and progress */}
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-6xl py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLessonList(!showLessonList)}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lessons</span>
              </Button>
            </div>
            
            <div className="mt-3 flex items-center gap-3">
              <Progress value={progressPercent} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {completedCount}/{totalCount} complete
              </span>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl py-8">
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Lesson Title */}
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {lesson.title}
                </h1>
                {isCompleted && (
                  <div className="inline-flex items-center gap-1 mt-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
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
                <CardContent className="p-8 text-center space-y-6">
                  {/* Arabic Script */}
                  <div 
                    className="text-4xl md:text-5xl lg:text-6xl font-arabic leading-relaxed text-foreground"
                    dir="rtl"
                    style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                  >
                    {lesson.arabic_text}
                  </div>
                  
                  {/* Transliteration */}
                  <div className="text-xl md:text-2xl text-muted-foreground italic">
                    {lesson.transliteration}
                  </div>

                  {/* Audio Player */}
                  <div className="pt-4">
                    <audio
                      ref={audioRef}
                      src={lesson.audio_url || undefined}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handlePlayPause}
                      className="gap-3 px-8 py-6 text-lg rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-all"
                      disabled={!lesson.audio_url}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-6 w-6" />
                          Pause Audio
                        </>
                      ) : (
                        <>
                          <Play className="h-6 w-6" />
                          Play Audio
                        </>
                      )}
                    </Button>
                    {!lesson.audio_url && (
                      <p className="text-sm text-muted-foreground mt-2">Audio coming soon</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => prevLesson && navigate(`/learn/lesson/${prevLesson.id}`)}
                  disabled={!prevLesson}
                  className="gap-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Previous
                </Button>

                {!isCompleted ? (
                  <Button
                    size="lg"
                    onClick={handleMarkComplete}
                    disabled={markComplete.isPending}
                    className="gap-2 px-8 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-5 w-5" />
                    {markComplete.isPending ? "Saving..." : "Mark as Complete"}
                  </Button>
                ) : nextLesson ? (
                  <Button
                    size="lg"
                    onClick={() => navigate(`/learn/lesson/${nextLesson.id}`)}
                    className="gap-2 px-8"
                  >
                    Next Lesson
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate(`/learn/unit/${unit?.id}`)}
                    className="gap-2 px-8"
                  >
                    Take Quiz
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => nextLesson && navigate(`/learn/lesson/${nextLesson.id}`)}
                  disabled={!nextLesson}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
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
    </Layout>
  );
}
