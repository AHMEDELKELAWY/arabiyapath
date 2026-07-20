/**
 * Intermediate-unit funnel analytics.
 *
 * Append-only writes to `public.unit_learning_events`. Never throws — analytics
 * must never block the learning flow. Also mirrors key events to GA4/Meta when
 * `window.gtag` / `window.fbq` are available.
 */
import { supabase } from "@/integrations/supabase/client";

export type UnitStep = "listening" | "learn" | "grammar" | "test";
export type UnitEventType =
  | "video_progress"
  | "video_ended"
  | "continue_click"
  | "step_completed";

interface LogArgs {
  userId: string;
  unitId: string;
  eventType: UnitEventType;
  step?: UnitStep;
  watchedPct?: number;
  metadata?: Record<string, unknown>;
}

// Throttle video_progress writes to ~1 per 5s per (unit, step) so a single
// learner watching a 10-min video produces ~120 rows instead of thousands.
const PROGRESS_THROTTLE_MS = 5000;
const lastProgressAt = new Map<string, number>();

export async function logUnitEvent(args: LogArgs): Promise<void> {
  const { userId, unitId, eventType, step, watchedPct, metadata } = args;
  if (!userId || !unitId) return;

  if (eventType === "video_progress") {
    const key = `${unitId}:${step ?? "listening"}`;
    const now = Date.now();
    const prev = lastProgressAt.get(key) ?? 0;
    if (now - prev < PROGRESS_THROTTLE_MS) return;
    lastProgressAt.set(key, now);
  }

  try {
    await (supabase as any).from("unit_learning_events").insert({
      user_id: userId,
      unit_id: unitId,
      event_type: eventType,
      step: step ?? null,
      watched_pct:
        typeof watchedPct === "number"
          ? Math.max(0, Math.min(100, Math.round(watchedPct)))
          : null,
      metadata: metadata ?? {},
    });
  } catch (err) {
    console.warn("[unitAnalytics] insert failed", err);
  }

  // Mirror funnel-critical events to GA4 / Meta Pixel.
  if (eventType !== "video_progress") {
    try {
      const w = window as any;
      if (typeof w.gtag === "function") {
        w.gtag("event", `unit_${eventType}`, {
          unit_id: unitId,
          step: step ?? null,
          watched_pct: watchedPct ?? null,
        });
      }
      if (typeof w.fbq === "function") {
        w.fbq("trackCustom", `unit_${eventType}`, {
          unit_id: unitId,
          step: step ?? null,
          watched_pct: watchedPct ?? null,
        });
      }
    } catch {
      /* noop */
    }
  }
}
