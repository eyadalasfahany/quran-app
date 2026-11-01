/** The target chips the misbaha offers (ADR 0034 §4). Any other target is a custom one. */
export const SIBHA_TARGET_PRESETS = [33, 99, 100] as const;

/** The largest count or target the misbaha accepts. */
export const SIBHA_MAX = 9999;

/** The longest label the user can type. */
export const SIBHA_LABEL_MAX = 40;

/**
 * The misbaha's own counter. `target` is null for no target. The label is the user's own words; the app supplies no
 * phrase (ADR 0034 §4: no preset dhikr).
 */
export type SibhaState = { count: number; target: number | null; label: string };

/** Starts on the 100 chip, as the Sibha frame draws it. */
export const DEFAULT_SIBHA_STATE: SibhaState = { count: 0, target: 100, label: '' };

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

/** The saved counter, or the default for a missing or damaged value. Each field is checked on its own. */
export function parseSibhaState(raw: string | undefined): SibhaState {
  if (raw === undefined) {
    return DEFAULT_SIBHA_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof SibhaState, unknown>>;
    return {
      count: typeof parsed.count === 'number' && Number.isInteger(parsed.count) && parsed.count >= 0 ? parsed.count : 0,
      label: typeof parsed.label === 'string' ? parsed.label.slice(0, SIBHA_LABEL_MAX) : '',
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
 * One tap. The count goes up without a cap, so counting continues past the target. `reachedTarget` is true only on the
 * tap that makes the count equal the target.
 */
export function countTap(state: SibhaState): { state: SibhaState; reachedTarget: boolean } {
  const count = state.count + 1;
  return {
    reachedTarget: state.target !== null && count === state.target,
    state: { ...state, count },
  };
}

/** A chip press. Pressing the active target clears it (a target is optional); any other value sets it. */
export function toggleTarget(current: number | null, pressed: number): number | null {
  return current === pressed ? null : pressed;
}

/** Whether a target is one of the chips rather than a custom number. */
export function isPresetTarget(target: number | null): boolean {
  return target !== null && (SIBHA_TARGET_PRESETS as readonly number[]).includes(target);
}
