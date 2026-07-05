import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

interface Props {
  unitId: string;
}

export interface GrammarExample {
  arabic: string;
  english: string;
  note?: string;
}

export interface GrammarRow {
  id: string;
  unit_id: string;
  title: string | null;
  explanation: string | null;
  examples: GrammarExample[] | null;
}

/**
 * Fetches grammar content for a unit. Returns `null` when no row exists so the
 * caller can hide the Grammar tab entirely (never render empty).
 */
export function useUnitGrammar(unitId: string | undefined) {
  return useQuery({
    queryKey: ["fc-unit-grammar", unitId],
    enabled: !!unitId,
    queryFn: async (): Promise<GrammarRow | null> => {
      const { data, error } = await (supabase as any)
        .from("flashcard_unit_grammar")
        .select("id,unit_id,title,explanation,examples")
        .eq("unit_id", unitId!)
        .maybeSingle();
      if (error) throw error;
      return (data as GrammarRow) ?? null;
    },
  });
}

export function GrammarLesson({ unitId }: Props) {
  const { data: grammar, isLoading } = useUnitGrammar(unitId);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-5 md:p-8 space-y-3">
          <div className="h-6 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!grammar) return null;

  const examples = Array.isArray(grammar.examples) ? grammar.examples : [];

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="p-5 md:p-8 space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <ScrollText className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wide font-semibold">Grammar</span>
        </div>

        {grammar.title && (
          <h2 className="text-xl md:text-2xl font-bold leading-snug">{grammar.title}</h2>
        )}

        {grammar.explanation && (
          <p className="whitespace-pre-line text-sm md:text-base text-muted-foreground leading-relaxed">
            {grammar.explanation}
          </p>
        )}

        {examples.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/80">Examples</h3>
            <ul className="space-y-3">
              {examples.map((ex, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-1.5"
                >
                  <p
                    className="text-xl md:text-2xl font-bold leading-loose"
                    dir="rtl"
                    lang="ar"
                  >
                    {ex.arabic}
                  </p>
                  <p className="text-sm md:text-base">{ex.english}</p>
                  {ex.note && (
                    <p className="text-xs text-muted-foreground italic">{ex.note}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
