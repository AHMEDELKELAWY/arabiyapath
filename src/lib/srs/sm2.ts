// SM-2 Spaced Repetition algorithm (client mirror of fc_apply_review).
// Used only for instant UI feedback; server is the source of truth.

export type Rating = "again" | "hard" | "good" | "easy";

export interface SrsState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
}

const DAY = 24 * 60 * 60 * 1000;

export function schedule(prev: Partial<SrsState> | null, rating: Rating): SrsState {
  let ease = prev?.easeFactor ?? 2.5;
  let reps = prev?.repetitions ?? 0;
  const prevInterval = prev?.intervalDays ?? 0;
  let interval: number;

  if (rating === "again") {
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.max(1, Math.round(prevInterval * ease));

    if (rating === "hard") {
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round(interval * 0.8));
    } else if (rating === "easy") {
      ease = ease + 0.15;
      interval = Math.round(interval * 1.3);
    }
  }

  return {
    easeFactor: ease,
    intervalDays: interval,
    repetitions: reps,
    dueAt: new Date(Date.now() + interval * DAY),
  };
}
