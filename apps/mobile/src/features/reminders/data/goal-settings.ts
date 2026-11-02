import { clockTrigger } from '@/features/azkar/reminders/schedule';
import { storage, storageKeys } from '@/core/storage/mmkv';

/**
 * The two goal reminders that live in the reminders hub (ADR 0034): the Friday Surat al-Kahf and the misbaha daily target.
 * Both are local (ADR 0027), off until the user turns them on, and no clock time is suggested for either: the Friday
 * default is the Dhuhr time, computed from the location, and the misbaha time is always the user's own choice.
 */

export type FridayMode = 'dhuhr' | 'clock';

export type FridayReminder = {
  enabled: boolean;
  mode: FridayMode;
  /** `HH:mm`, used when `mode` is `clock`. */
  clockTime: string | null;
};

export type MisbahaReminder = {
  enabled: boolean;
  /** `HH:mm`. Null until the user picks a time: nothing is scheduled without one. */
  clockTime: string | null;
};

export const NO_FRIDAY_REMINDER: FridayReminder = { enabled: false, mode: 'dhuhr', clockTime: null };
export const NO_MISBAHA_REMINDER: MisbahaReminder = { enabled: false, clockTime: null };

function validClock(value: unknown): string | null {
  return typeof value === 'string' && clockTrigger(value) !== null ? value : null;
}

function parseRecord(key: string): Record<string, unknown> | null {
  const raw = storage.getString(key);
  if (raw === undefined) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function readFridayReminder(): FridayReminder {
  const record = parseRecord(storageKeys.reminders.friday);
  if (record === null) {
    return NO_FRIDAY_REMINDER;
  }
  return {
    enabled: record.enabled === true,
    mode: record.mode === 'clock' ? 'clock' : 'dhuhr',
    clockTime: validClock(record.clockTime),
  };
}

export function writeFridayReminder(value: FridayReminder): void {
  storage.set(storageKeys.reminders.friday, JSON.stringify(value));
}

export function readMisbahaReminder(): MisbahaReminder {
  const record = parseRecord(storageKeys.reminders.misbaha);
  if (record === null) {
    return NO_MISBAHA_REMINDER;
  }
  return { enabled: record.enabled === true, clockTime: validClock(record.clockTime) };
}

export function writeMisbahaReminder(value: MisbahaReminder): void {
  storage.set(storageKeys.reminders.misbaha, JSON.stringify(value));
}
