import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useDialectLevels(dialectId?: string) {
  return useQuery({
    queryKey: ["dialect-levels", dialectId],
    queryFn: async () => {
      if (!dialectId) return null;
      
      const { data: dialect, error: dialectError } = await supabase
        .from("dialects")
        .select("*")
        .eq("id", dialectId)
        .single();
      
      if (dialectError) throw dialectError;
      
      const { data: levels, error: levelsError } = await supabase
        .from("levels")
        .select("*")
        .eq("dialect_id", dialectId)
        .order("order_index");
      
      if (levelsError) throw levelsError;
      
      return { dialect, levels };
    },
    enabled: !!dialectId,
  });
}

export function useLevelUnits(levelId?: string) {
  return useQuery({
    queryKey: ["level-units", levelId],
    queryFn: async () => {
      if (!levelId) return null;
      
      const { data: level, error: levelError } = await supabase
        .from("levels")
        .select("*, dialects(*)")
        .eq("id", levelId)
        .single();
      
      if (levelError) throw levelError;
      
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("*")
        .eq("level_id", levelId)
        .order("order_index");
      
      if (unitsError) throw unitsError;
      
      return { level, units };
    },
    enabled: !!levelId,
  });
}

export function useUnitLessons(unitId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["unit-lessons", unitId, user?.id],
    queryFn: async () => {
      if (!unitId) return null;
      
      const { data: unit, error: unitError } = await supabase
        .from("units")
        .select("*, levels(*, dialects(*))")
        .eq("id", unitId)
        .single();
      
      if (unitError) throw unitError;
      
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("unit_id", unitId)
        .order("order_index");
      
      if (lessonsError) throw lessonsError;
      
      // Get user progress for these lessons
      let completedLessonIds: string[] = [];
      if (user) {
        const { data: progress } = await supabase
          .from("user_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .in("lesson_id", lessons.map(l => l.id));
        
        completedLessonIds = progress?.map(p => p.lesson_id) || [];
      }
      
      // Get quiz for this unit
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("*")
        .eq("unit_id", unitId)
        .maybeSingle();
      
      // Get user's quiz attempts
      let quizAttempts: any[] = [];
      if (user && quiz) {
        const { data } = await supabase
          .from("quiz_attempts")
          .select("*")
          .eq("user_id", user.id)
          .eq("quiz_id", quiz.id)
          .order("created_at", { ascending: false });
        
        quizAttempts = data || [];
      }
      
      return {
        unit,
        lessons: lessons.map(l => ({
          ...l,
          completed: completedLessonIds.includes(l.id),
        })),
        quiz,
        quizAttempts,
        completedCount: completedLessonIds.length,
        totalCount: lessons.length,
      };
    },
    enabled: !!unitId,
  });
}

export function useLesson(lessonId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["lesson", lessonId, user?.id],
    queryFn: async () => {
      if (!lessonId) return null;
      
      const { data: lesson, error } = await supabase
        .from("lessons")
        .select("*, units(*, levels(*, dialects(*)))")
        .eq("id", lessonId)
        .single();
      
      if (error) throw error;
      
      // Get all lessons in this unit for navigation
      const { data: unitLessons } = await supabase
        .from("lessons")
        .select("id, title, order_index")
        .eq("unit_id", lesson.unit_id)
        .order("order_index");
      
      // Get user progress
      let isCompleted = false;
      let completedLessonIds: string[] = [];
      if (user) {
        const { data: progress } = await supabase
          .from("user_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .in("lesson_id", unitLessons?.map(l => l.id) || []);
        
        completedLessonIds = progress?.map(p => p.lesson_id) || [];
        isCompleted = completedLessonIds.includes(lessonId);
      }
      
      const currentIndex = unitLessons?.findIndex(l => l.id === lessonId) || 0;
      const prevLesson = currentIndex > 0 ? unitLessons?.[currentIndex - 1] : null;
      const nextLesson = currentIndex < (unitLessons?.length || 0) - 1 ? unitLessons?.[currentIndex + 1] : null;
      
      return {
        lesson,
        unit: lesson.units,
        level: lesson.units?.levels,
        dialect: lesson.units?.levels?.dialects,
        unitLessons: unitLessons?.map(l => ({
          ...l,
          completed: completedLessonIds.includes(l.id),
        })) || [],
        currentIndex,
        prevLesson,
        nextLesson,
        isCompleted,
        completedCount: completedLessonIds.length,
        totalCount: unitLessons?.length || 0,
      };
    },
    enabled: !!lessonId,
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_progress")
        .insert({ user_id: user.id, lesson_id: lessonId });
      
      if (error && error.code !== "23505") throw error; // Ignore duplicate key error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson"] });
      queryClient.invalidateQueries({ queryKey: ["unit-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useQuiz(quizId?: string) {
  return useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      if (!quizId) return null;
      
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*, units(*, levels(*, dialects(*)))")
        .eq("id", quizId)
        .single();
      
      if (quizError) throw quizError;
      
      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index");
      
      if (questionsError) throw questionsError;
      
      return {
        quiz,
        questions: questions.map(q => ({
          ...q,
          options: JSON.parse(q.options_json as string),
        })),
        unit: quiz.units,
        level: quiz.units?.levels,
        dialect: quiz.units?.levels?.dialects,
      };
    },
    enabled: !!quizId,
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ quizId, score, passed }: { quizId: string; score: number; passed: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("quiz_attempts")
        .insert({ user_id: user.id, quiz_id: quizId, score, passed });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz"] });
      queryClient.invalidateQueries({ queryKey: ["unit-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
