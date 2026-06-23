/**
 * ArabiyaPath Unit Standard — Permanent Template
 *
 * Single source of truth for the unit learning architecture.
 *
 * Every unit, current and future, renders through the same 4-tab experience:
 *   Learn → Listening → Speaking → Test Yourself
 *
 * - Learn content is authored manually (kind = 'learn').
 * - Speaking content is authored manually (kind = 'speaking').
 * - Listening and Test Yourself are auto-generated from both kinds.
 *
 * Do NOT fork per-unit. Do NOT introduce alternate kinds or tab orders.
 */

export const UNIT_STANDARD_VERSION = 1;

export const UNIT_TABS = ["learn", "listening", "speaking", "test"] as const;
export type UnitTab = (typeof UNIT_TABS)[number];

export const LEARN_KIND = "learn" as const;
export const SPEAKING_KIND = "speaking" as const;

export const LISTENING_SOURCE_KINDS = ["learn", "speaking"] as const;
export const TEST_SOURCE_KINDS = ["learn", "speaking"] as const;

export type FlashcardKind = typeof LEARN_KIND | typeof SPEAKING_KIND;
