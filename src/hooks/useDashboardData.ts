import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LevelProgress {
  levelId: string;
  levelName: string;
  dialectId: string;
  dialectName: string;
  totalLessons: number;
  completedLessons: number;
  completedUnits: number;
  totalUnits: number;
  progressPercent: number;
  orderIndex: number;
}

export interface RecentActivity {
  lessonId: string;
  lessonTitle: string;
  unitTitle: string;
  levelId: string;
  levelName: string;
  dialectId: string;
  dialectName: string;
  completedAt: string;
}

export interface QuizResult {
  id: string;
  unitTitle: string;
  dialectName: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

export interface Certificate {
  id: string;
  dialectName: string;
  levelName: string;
  issuedAt: string;
  certCode: string;
  publicUrl: string | null;
}

export interface Purchase {
  id: string;
  productId: string;
  dialectId: string | null;
  scope: string;
  status: string;
}

export function useDashboardData() {
  const { user } = useAuth();

  // Fetch all dialects with their levels, units, and lessons
  const { data: dialects, isLoading: dialectsLoading } = useQuery({
    queryKey: ["dialects-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dialects")
        .select(`
          id,
          name,
          levels (
            id,
            name,
            order_index,
            units (
              id,
              title,
              lessons (
                id,
                title
              )
            )
          )
        `);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user progress
  const { data: userProgress, isLoading: progressLoading } = useQuery({
    queryKey: ["user-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_progress")
        .select(`
          id,
          lesson_id,
          completed_at,
          lessons (
            id,
            title,
            units (
              id,
              title,
              levels (
                id,
                name,
                dialects (
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch quiz attempts
  const { data: quizAttempts, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz-attempts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          score,
          passed,
          created_at,
          quizzes (
            units (
              title,
              levels (
                dialects (
                  name
                )
              )
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch certificates
  const { data: certificates, isLoading: certificatesLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id,
          issued_at,
          cert_code,
          public_url,
          dialects (
            name
          ),
          levels (
            name
          )
        `)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch purchases - include both "active" and "completed" statuses as valid
  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          product_id,
          status,
          products (
            scope,
            dialect_id
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "completed"]);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate level progress (grouped by dialect)
  const levelProgress: LevelProgress[] = dialects?.flatMap((dialect) => {
    return (dialect.levels || []).map((level) => {
      const allLessons = level.units?.flatMap((unit) => unit.lessons || []) || [];
      const allUnits = level.units || [];
      
      const completedLessonIds = new Set(
        userProgress
          ?.filter((p) => {
            const lessonLevelId = p.lessons?.units?.levels?.id;
            return lessonLevelId === level.id;
          })
          .map((p) => p.lesson_id)
      );
      
      const completedUnits = allUnits.filter((unit) => {
        const unitLessons = unit.lessons || [];
        return unitLessons.length > 0 && 
          unitLessons.every((lesson) => completedLessonIds.has(lesson.id));
      }).length;
      
      return {
        levelId: level.id,
        levelName: level.name,
        dialectId: dialect.id,
        dialectName: dialect.name,
        totalLessons: allLessons.length,
        completedLessons: completedLessonIds.size,
        completedUnits,
        totalUnits: allUnits.length,
        progressPercent: allLessons.length > 0 
          ? Math.round((completedLessonIds.size / allLessons.length) * 100) 
          : 0,
        orderIndex: level.order_index,
      };
    });
  }).sort((a, b) => a.orderIndex - b.orderIndex) || [];

  // Group levels by dialect
  const levelsByDialect = levelProgress.reduce((acc, level) => {
    if (!acc[level.dialectId]) {
      acc[level.dialectId] = {
        dialectId: level.dialectId,
        dialectName: level.dialectName,
        levels: [],
      };
    }
    acc[level.dialectId].levels.push(level);
    return acc;
  }, {} as Record<string, { dialectId: string; dialectName: string; levels: LevelProgress[] }>);

  // Recent activity (last 5 lessons) with level info
  const recentActivity: RecentActivity[] = userProgress?.slice(0, 5).map((p) => ({
    lessonId: p.lesson_id,
    lessonTitle: p.lessons?.title || "Unknown Lesson",
    unitTitle: p.lessons?.units?.title || "Unknown Unit",
    levelId: p.lessons?.units?.levels?.id || "",
    levelName: p.lessons?.units?.levels?.name || "Unknown Level",
    dialectId: p.lessons?.units?.levels?.dialects?.id || "",
    dialectName: p.lessons?.units?.levels?.dialects?.name || "Unknown Dialect",
    completedAt: p.completed_at,
  })) || [];

  // Quiz results
  const quizResults: QuizResult[] = quizAttempts?.map((attempt) => ({
    id: attempt.id,
    unitTitle: attempt.quizzes?.units?.title || "Unknown Unit",
    dialectName: attempt.quizzes?.units?.levels?.dialects?.name || "Unknown Dialect",
    score: attempt.score,
    passed: attempt.passed,
    createdAt: attempt.created_at,
  })) || [];

  // Certificates list
  const certificatesList: Certificate[] = certificates?.map((cert) => ({
    id: cert.id,
    dialectName: cert.dialects?.name || "Unknown Dialect",
    levelName: cert.levels?.name || "Unknown Level",
    issuedAt: cert.issued_at,
    certCode: cert.cert_code,
    publicUrl: cert.public_url,
  })) || [];

  // Check access to dialects
  const hasAccess = (dialectId: string): boolean => {
    if (!purchases || purchases.length === 0) return false;
    
    return purchases.some((purchase) => {
      // Check for all-access bundle (scope can be "all" or "bundle")
      if (purchase.products?.scope === "all" || purchase.products?.scope === "bundle") return true;
      // Check for individual dialect purchase
      return purchase.products?.dialect_id === dialectId;
    });
  };

  // Check if user has any all-access purchases
  const hasBundleAccess = purchases?.some(
    (p) => p.products?.scope === "all" || p.products?.scope === "bundle"
  ) || false;

  return {
    levelProgress,
    levelsByDialect: Object.values(levelsByDialect),
    recentActivity,
    quizResults,
    certificates: certificatesList,
    hasAccess,
    hasBundleAccess,
    isLoading: dialectsLoading || progressLoading || quizLoading || certificatesLoading || purchasesLoading,
  };
}
