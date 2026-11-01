import { storage, storageKeys } from '@/core/storage/mmkv';

/** The misbaha goal a user gets when they first switch it on (the Sibha frame's 100). */
export const MISBAHA_GOAL_DEFAULT = 100;
export const MISBAHA_GOAL_MIN = 1;
export const MISBAHA_GOAL_MAX = 9999;

/**
 * The daily goals the user chose (ADR 0034 §5). Nothing is tracked until it is switched on: `wird` is the Khatma's
 * pages for today, `sessions` are Azkar session category ids, and `misbahaTarget` is the misbaha goal (null when off).
 */
export type DailyGoals = {
  wird: boolean;
  sessions: string[];
  misbahaTarget: number | null;
};

export const NO_DAILY_GOALS: DailyGoals = { misbahaTarget: null, sessions: [], wird: false };

function isGoalNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MISBAHA_GOAL_MIN && value <= MISBAHA_GOAL_MAX;
}

/** The saved goals, or none for a missing or damaged value. Each field is checked on its own. */
export function parseDailyGoals(raw: string | undefined): DailyGoals {
  if (raw === undefined) {
    return NO_DAILY_GOALS;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof DailyGoals, unknown>>;
    const sessions = Array.isArray(parsed.sessions)
      ? [...new Set(parsed.sessions.filter((id): id is string => typeof id === 'string'))]
      : [];
    return {
      misbahaTarget: isGoalNumber(parsed.misbahaTarget) ? parsed.misbahaTarget : null,
      sessions,
      wird: parsed.wird === true,
    };
  } catch {
    return NO_DAILY_GOALS;
  }
}

export function readDailyGoals(): DailyGoals {
  return parseDailyGoals(storage.getString(storageKeys.dailyGoals));
}

export function saveDailyGoals(goals: DailyGoals): void {
  storage.set(storageKeys.dailyGoals, JSON.stringify(goals));
}

export function setWirdGoal(goals: DailyGoals, on: boolean): DailyGoals {
  return { ...goals, wird: on };
}

/** Tracks an Azkar session for the day, or stops tracking it. Each session appears once. */
export function setSessionGoal(goals: DailyGoals, sessionId: string, on: boolean): DailyGoals {
  const others = goals.sessions.filter((id) => id !== sessionId);
  return { ...goals, sessions: on ? [...others, sessionId] : others };
}

/** Switches the misbaha goal on at the default, or off. */
export function setMisbahaGoalOn(goals: DailyGoals, on: boolean): DailyGoals {
  return { ...goals, misbahaTarget: on ? (goals.misbahaTarget ?? MISBAHA_GOAL_DEFAULT) : null };
}

/** One step of the misbaha goal stepper, kept within its range. An off goal does not move. */
export function stepMisbahaGoal(goals: DailyGoals, step: number): DailyGoals {
  if (goals.misbahaTarget === null) {
    return goals;
  }
  const next = Math.min(MISBAHA_GOAL_MAX, Math.max(MISBAHA_GOAL_MIN, goals.misbahaTarget + step));
  return { ...goals, misbahaTarget: next };
}
