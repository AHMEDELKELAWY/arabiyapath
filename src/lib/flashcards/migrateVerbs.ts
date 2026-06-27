/**
 * Verbs unit — clean image reset.
 *
 * The previous migration incorrectly assumed Learn and Speaking cards share the
 * same image. They do NOT — canonical identity is (unit_slug + kind + order_index).
 *
 * This helper clears all image fields on every Verbs card so admins can
 * re-upload fresh, kind-specific image sets through Bulk Upload (Learn tab,
 * then Speaking tab). It does NOT touch card text, audio, order, or any
 * other learner-facing field.
 *
 * Storage files are left in place — the next upload will overwrite the
 * canonical per-kind paths.
 */

import { supabase } from "@/integrations/supabase/client";

const VERBS_SLUG = "verbs";

export interface VerbsResetItem {
  cardId: string;
  order_index: number;
  kind: string;
  status: "cleared" | "failed";
  message?: string;
}

export interface VerbsResetReport {
  unitId: string;
  totalCards: number;
  cleared: number;
  failed: number;
  byKind: { learn: number; speaking: number };
  items: VerbsResetItem[];
}

export async function resetVerbsImages(
  onProgress?: (done: number, total: number) => void,
): Promise<VerbsResetReport> {
  const { data: unit, error: unitErr } = await (supabase as any)
    .from("flashcard_units").select("id,slug").eq("slug", VERBS_SLUG).single();
  if (unitErr || !unit) throw new Error("Verbs unit not found");

  const { data: cards, error: cardsErr } = await (supabase as any)
    .from("flashcards")
    .select("id, order_index, kind")
    .eq("unit_id", unit.id)
    .order("kind").order("order_index");
  if (cardsErr) throw cardsErr;

  const report: VerbsResetReport = {
    unitId: unit.id,
    totalCards: cards?.length ?? 0,
    cleared: 0,
    failed: 0,
    byKind: { learn: 0, speaking: 0 },
    items: [],
  };

  for (let i = 0; i < (cards?.length ?? 0); i++) {
    const c = cards[i];
    onProgress?.(i, cards.length);
    const { error } = await (supabase as any)
      .from("flashcards")
      .update({
        image_url: null,
        thumbnail_url: null,
        image_width: null,
        image_height: null,
        image_size_kb: null,
      })
      .eq("id", c.id);
    if (error) {
      report.failed++;
      report.items.push({ cardId: c.id, order_index: c.order_index, kind: c.kind, status: "failed", message: error.message });
    } else {
      report.cleared++;
      if (c.kind === "learn" || c.kind === "speaking") report.byKind[c.kind]++;
      report.items.push({ cardId: c.id, order_index: c.order_index, kind: c.kind, status: "cleared" });
    }
  }
  onProgress?.(cards?.length ?? 0, cards?.length ?? 0);
  return report;
}
