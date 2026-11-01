/** The target chips the misbaha offers (ADR 0034 §4). Any other target is a custom one. */
export const SIBHA_TARGET_PRESETS = [33, 99, 100] as const;

/** The largest count or target the misbaha accepts. */
export const SIBHA_MAX = 9999;

/** The longest label the user can type. */
export const SIBHA_LABEL_MAX = 40;

/**
 * The misbaha's own counter. `target` is null for no target («بلا حد»): the count only grows and never completes a round.
 * `rounds` counts the targets completed since the last reset or target change. The label is the user's own words; the
 * app supplies no phrase (ADR 0034 §4: no preset dhikr).
 */
export type SibhaState = { count: number; target: number | null; label: string; rounds: number };

/** Starts on the 100 chip, as the Sibha frame draws it. */
export const DEFAULT_SIBHA_STATE: SibhaState = { count: 0, target: 100, label: '', rounds: 0 };

/** Today's taps by local date. A new date starts from zero. */
export type SibhaToday = { date: string; total: number };

export function isValidSibhaNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= SIBHA_MAX;
}

/** Parses a typed number, accepting Arabic-Indic digits. Returns null unless it is a whole number from 1 to 9999. */
export function parseSibhaNumber(input: string): number | null {
  const western = input.trim().replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
  if (!/^\d{1,4}$/.test(western)) {
    return null;
  }
  const value = Number(western);
  return isValidSibhaNumber(value) ? value : null;
}

function isTarget(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && isValidSibhaNumber(value));
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** The saved counter, or the default for a missing or damaged value. Each field is checked on its own. */
export function parseSibhaState(raw: string | undefined): SibhaState {
  if (raw === undefined) {
    return DEFAULT_SIBHA_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof SibhaState, unknown>>;
    return {
      count: isCount(parsed.count) ? parsed.count : 0,
      label: typeof parsed.label === 'string' ? parsed.label.slice(0, SIBHA_LABEL_MAX) : '',
      rounds: isCount(parsed.rounds) ? parsed.rounds : 0,
      target: isTarget(parsed.target) ? parsed.target : DEFAULT_SIBHA_STATE.target,
    };
  } catch {
    return DEFAULT_SIBHA_STATE;
  }
}

/** Today's total for `date`: the saved total when it is for that date, otherwise zero (a new day starts at zero). */
export function todayTotalFor(raw: string | undefined, date: string): number {
  if (raw === undefined) {
    return 0;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SibhaToday>;
    return parsed.date === date && typeof parsed.total === 'number' && parsed.total >= 0 ? Math.floor(parsed.total) : 0;
  } catch {
    return 0;
  }
}

/**
 * One tap. With a target, reaching it completes a round: the count goes back to zero, `rounds` goes up by one and
 * `reachedTarget` is true. The test is `>=`, so a count already past a lowered target still completes on the next tap.
 * With no target the count only grows.
 */
export function countTap(state: SibhaState): { state: SibhaState; reachedTarget: boolean } {
  const count = state.count + 1;
  if (state.target !== null && count >= state.target) {
    return { reachedTarget: true, state: { ...state, count: 0, rounds: state.rounds + 1 } };
  }
  return { reachedTarget: false, state: { ...state, count } };
}

/** Sets the target. Any change starts the rounds again; the count is kept. */
export function withTarget(state: SibhaState, target: number | null): SibhaState {
  return { ...state, rounds: 0, target };
}

/** Reset: the count and the rounds go back to zero. The target and label stay. Today's total is kept elsewhere. */
export function resetCount(state: SibhaState): SibhaState {
  return { ...state, count: 0, rounds: 0 };
}

/**
 * A chip press. Pressing the active preset clears the target, which is «بلا حد» (no target); any other value sets it.
 */
export function toggleTarget(current: number | null, pressed: number): number | null {
  return current === pressed ? null : pressed;
}

/** Whether a target is one of the chips rather than a custom number. */
export function isPresetTarget(target: number | null): boolean {
  return target !== null && (SIBHA_TARGET_PRESETS as readonly number[]).includes(target);
}
