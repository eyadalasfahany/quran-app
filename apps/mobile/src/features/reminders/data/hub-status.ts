import type { AzkarReminder } from '@/features/azkar/reminders/reminders-repository';

import type { FridayReminder, MisbahaReminder } from './goal-settings';

/**
 * The status a reminder row shows (the reminders hub, ADR 0034): scheduled, off, the system refused notifications, the
 * pending pool is full, or a location or a time is still needed. Pure, so the hub's rules are tested without a screen.
 */
export type ReminderStatus = 'off' | 'scheduled' | 'permissionDenied' | 'budgetFull' | 'needsLocation' | 'needsTime';

/** The i18n key of a status (`reminders.status.<status>`). */
export function reminderStatusKey(status: ReminderStatus): `reminders.status.${ReminderStatus}` {
  return `reminders.status.${status}`;
}

/** `granted` is null while the permission is still being read. Only a known refusal changes a status. */
export type PermissionInput = { granted: boolean | null };

export function fridayStatus(
  settings: FridayReminder,
  input: PermissionInput & { hasLocation: boolean | null },
): ReminderStatus {
  if (!settings.enabled) {
    return 'off';
  }
  if (input.granted === false) {
    return 'permissionDenied';
  }
  if (settings.mode === 'dhuhr') {
    return input.hasLocation === false ? 'needsLocation' : 'scheduled';
  }
  return settings.clockTime === null ? 'needsTime' : 'scheduled';
}

export function misbahaStatus(settings: MisbahaReminder, input: PermissionInput): ReminderStatus {
  if (!settings.enabled) {
    return 'off';
  }
  if (input.granted === false) {
    return 'permissionDenied';
  }
  return settings.clockTime === null ? 'needsTime' : 'scheduled';
}

/**
 * An Azkar session's status. `unscheduled` is true when the pending pool (`planAzkarBudget`) left this reminder out.
 * A prayer-relative reminder needs a location; a clock one needs a time.
 */
export function azkarStatus(
  reminder: Pick<AzkarReminder, 'enabled' | 'triggerType' | 'clockTime'> | null,
  input: PermissionInput & { unscheduled: boolean; hasLocation: boolean | null },
): ReminderStatus {
  if (reminder === null || !reminder.enabled) {
    return 'off';
  }
  if (input.granted === false) {
    return 'permissionDenied';
  }
  if (input.unscheduled) {
    return 'budgetFull';
  }
  if (reminder.triggerType === 'clock') {
    return reminder.clockTime === null ? 'needsTime' : 'scheduled';
  }
  return input.hasLocation === false ? 'needsLocation' : 'scheduled';
}
