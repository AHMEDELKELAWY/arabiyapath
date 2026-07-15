import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFlashcardCourseStructure } from "@/hooks/useFlashcardCourseStructure";

/**
 * Shared Course → Level → Unit selection used across every admin content page.
 *
 * There are two hierarchies in the DB:
 *   - `flashcard_courses` → `flashcard_course_levels` → `flashcard_units`
 *     (Spoken Arabic / Vocabulary / Grammar / Speaking / Listening)
 *   - `dialects` → `levels` → `units` (legacy Learn content)
 *
 * We expose both scopes via a single provider so admin pages don't need to know
 * which storage backs their content — they just call `useAdminFlashcardScope()`
 * or `useAdminLearnScope()` and get a stable `{ levelId, unitId }` pair that
 * survives navigation and reloads (localStorage-backed).
 */

type ScopeState = {
  levelId: string | null;
  unitId: string | null;
};

type ScopeContextValue = {
  flashcard: ScopeState & {
    setLevel: (id: string | null) => void;
    setUnit: (id: string | null) => void;
  };
  learn: ScopeState & {
    setLevel: (id: string | null) => void;
    setUnit: (id: string | null) => void;
  };
};

const KEY = "admin.scope.v1";

const AdminScopeContext = createContext<ScopeContextValue | null>(null);

function readStored(): { flashcard: ScopeState; learn: ScopeState } {
  if (typeof window === "undefined") {
    return { flashcard: { levelId: null, unitId: null }, learn: { levelId: null, unitId: null } };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw);
    return {
      flashcard: {
        levelId: parsed?.flashcard?.levelId ?? null,
        unitId: parsed?.flashcard?.unitId ?? null,
      },
      learn: {
        levelId: parsed?.learn?.levelId ?? null,
        unitId: parsed?.learn?.unitId ?? null,
      },
    };
  } catch {
    return { flashcard: { levelId: null, unitId: null }, learn: { levelId: null, unitId: null } };
  }
}

export function AdminScopeProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readStored, []);
  const [flashcard, setFlashcard] = useState<ScopeState>(initial.flashcard);
  const [learn, setLearn] = useState<ScopeState>(initial.learn);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ flashcard, learn }));
    } catch {
      /* ignore quota errors */
    }
  }, [flashcard, learn]);

  const value: ScopeContextValue = {
    flashcard: {
      ...flashcard,
      setLevel: (id) => setFlashcard({ levelId: id, unitId: null }),
      setUnit: (id) => setFlashcard((s) => ({ ...s, unitId: id })),
    },
    learn: {
      ...learn,
      setLevel: (id) => setLearn({ levelId: id, unitId: null }),
      setUnit: (id) => setLearn((s) => ({ ...s, unitId: id })),
    },
  };

  return <AdminScopeContext.Provider value={value}>{children}</AdminScopeContext.Provider>;
}

function useScope() {
  const ctx = useContext(AdminScopeContext);
  if (!ctx) throw new Error("AdminScopeProvider missing in tree");
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* Flashcard scope (Spoken Arabic)                                             */
/* -------------------------------------------------------------------------- */

export interface FlashcardLevelOption {
  id: string;
  label: string; // "Spoken Arabic – Beginner"
  courseTitle: string;
  levelTitle: string;
  unitIds: string[];
}

export interface FlashcardUnitOption {
  id: string;
  title: string;
  slug: string;
  levelId: string | null;
}

export function useAdminFlashcardScope() {
  const { flashcard } = useScope();
  const { data: courses } = useFlashcardCourseStructure();

  const { data: allUnits } = useQuery({
    queryKey: ["admin-scope-fc-units"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id, slug, title_en, course_level_id, order_index, published")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const levelOptions: FlashcardLevelOption[] = useMemo(() => {
    return (courses ?? []).flatMap((c) =>
      c.levels.map((l) => ({
        id: l.id,
        label: `${c.title_en} – ${l.title_en}`,
        courseTitle: c.title_en,
        levelTitle: l.title_en,
        unitIds: l.unit_ids,
      })),
    );
  }, [courses]);

  const unitOptions: FlashcardUnitOption[] = useMemo(() => {
    const rows = allUnits ?? [];
    const filtered = flashcard.levelId
      ? rows.filter((u) => u.course_level_id === flashcard.levelId)
      : rows;
    return filtered.map((u) => ({
      id: u.id,
      title: u.title_en,
      slug: u.slug,
      levelId: u.course_level_id,
    }));
  }, [allUnits, flashcard.levelId]);

  const currentLevel = levelOptions.find((l) => l.id === flashcard.levelId) ?? null;
  const currentUnit = unitOptions.find((u) => u.id === flashcard.unitId) ?? null;

  // Auto-select a level once data loads if nothing is selected.
  useEffect(() => {
    if (!flashcard.levelId && levelOptions.length > 0) {
      flashcard.setLevel(levelOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelOptions.length]);

  // If the selected unit no longer belongs to the selected level, reset it.
  useEffect(() => {
    if (flashcard.unitId && !unitOptions.some((u) => u.id === flashcard.unitId)) {
      flashcard.setUnit(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcard.levelId, unitOptions.length]);

  return {
    levelId: flashcard.levelId,
    unitId: flashcard.unitId,
    setLevel: flashcard.setLevel,
    setUnit: flashcard.setUnit,
    levelOptions,
    unitOptions,
    currentLevel,
    currentUnit,
  };
}

/* -------------------------------------------------------------------------- */
/* Learn scope (dialects/levels/units)                                         */
/* -------------------------------------------------------------------------- */

export interface LearnLevelOption {
  id: string;
  label: string; // "Gulf Arabic – Beginner"
}

export interface LearnUnitOption {
  id: string;
  title: string;
  levelId: string | null;
}

export function useAdminLearnScope() {
  const { learn } = useScope();

  const { data: levels } = useQuery({
    queryKey: ["admin-scope-learn-levels"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("levels")
        .select("id, name, order_index, dialects(id,name)")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: units } = useQuery({
    queryKey: ["admin-scope-learn-units"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("units")
        .select("id, title, level_id, order_index")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const levelOptions: LearnLevelOption[] = useMemo(
    () =>
      (levels ?? []).map((l: any) => ({
        id: l.id,
        label: `${l.dialects?.name ?? "?"} – ${l.name}`,
      })),
    [levels],
  );

  const unitOptions: LearnUnitOption[] = useMemo(() => {
    const rows = units ?? [];
    const filtered = learn.levelId ? rows.filter((u) => u.level_id === learn.levelId) : rows;
    return filtered.map((u) => ({ id: u.id, title: u.title, levelId: u.level_id }));
  }, [units, learn.levelId]);

  useEffect(() => {
    if (!learn.levelId && levelOptions.length > 0) {
      learn.setLevel(levelOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelOptions.length]);

  useEffect(() => {
    if (learn.unitId && !unitOptions.some((u) => u.id === learn.unitId)) {
      learn.setUnit(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learn.levelId, unitOptions.length]);

  return {
    levelId: learn.levelId,
    unitId: learn.unitId,
    setLevel: learn.setLevel,
    setUnit: learn.setUnit,
    levelOptions,
    unitOptions,
    currentLevel: levelOptions.find((l) => l.id === learn.levelId) ?? null,
    currentUnit: unitOptions.find((u) => u.id === learn.unitId) ?? null,
  };
}
