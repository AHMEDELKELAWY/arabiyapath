import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Course → Level → Units hierarchy for the Vocabulary / Spoken Arabic section.
 *
 * The DB tables `flashcard_courses` and `flashcard_course_levels` support
 * unlimited future courses (Business Arabic, Quran Arabic, Kids Arabic…).
 * Units are linked via `flashcard_units.course_level_id` (nullable to preserve
 * legacy behavior — unlinked units surface under a synthetic "Other" level).
 */

export interface FCCourseLevel {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  order_index: number;
  published: boolean;
  unit_ids: string[];
}

export interface FCCourse {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  order_index: number;
  published: boolean;
  levels: FCCourseLevel[];
}

export function useFlashcardCourseStructure() {
  return useQuery<FCCourse[]>({
    queryKey: ["fc-course-structure"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [coursesRes, levelsRes, unitsRes] = await Promise.all([
        (supabase as any)
          .from("flashcard_courses")
          .select("id, slug, title_en, title_ar, order_index, published")
          .eq("published", true)
          .order("order_index"),
        (supabase as any)
          .from("flashcard_course_levels")
          .select("id, course_id, slug, title_en, title_ar, order_index, published")
          .eq("published", true)
          .order("order_index"),
        (supabase as any)
          .from("flashcard_units")
          .select("id, course_level_id"),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (levelsRes.error) throw levelsRes.error;
      if (unitsRes.error) throw unitsRes.error;

      const unitsByLevel = new Map<string, string[]>();
      for (const u of unitsRes.data ?? []) {
        if (!u.course_level_id) continue;
        const arr = unitsByLevel.get(u.course_level_id) ?? [];
        arr.push(u.id);
        unitsByLevel.set(u.course_level_id, arr);
      }

      const levelsByCourse = new Map<string, FCCourseLevel[]>();
      for (const l of levelsRes.data ?? []) {
        const arr = levelsByCourse.get(l.course_id) ?? [];
        arr.push({
          id: l.id,
          slug: l.slug,
          title_en: l.title_en,
          title_ar: l.title_ar,
          order_index: l.order_index,
          published: l.published,
          unit_ids: unitsByLevel.get(l.id) ?? [],
        });
        levelsByCourse.set(l.course_id, arr);
      }

      return (coursesRes.data ?? []).map((c: any) => ({
        id: c.id,
        slug: c.slug,
        title_en: c.title_en,
        title_ar: c.title_ar,
        order_index: c.order_index,
        published: c.published,
        levels: (levelsByCourse.get(c.id) ?? []).sort(
          (a, b) => a.order_index - b.order_index
        ),
      }));
    },
  });
}
