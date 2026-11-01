import { AZKAR_ROLLING_DAYS, AZKAR_SLOTS } from '@/features/notifications/budget';

import { listReminders, type AzkarReminder, type AzkarReminderInput, type RemindersStore } from './reminders-repository';
import { clockTrigger } from './schedule';

/**
 * Plans how many pending notifications each Azkar reminder may hold, inside the Azkar share of the iOS pool
 * (ADR 0031 §7; `AZKAR_SLOTS`). A clock reminder takes one slot. A prayer-relative reminder takes one slot per day of
 * its window, up to `AZKAR_ROLLING_DAYS`.
 *
 * Order is deterministic: categories before entries, then the oldest update first, then id. When the full windows do
 * not fit, the windows shrink (down to one day each) in that order, so the newest reminders get the shortest windows.
 * Only when even one slot each does not fit are the newest reminders left unscheduled.
 */

type Planned = Pick<AzkarReminder, 'id' | 'targetType' | 'enabled' | 'triggerType' | 'clockTime' | 'prayer' | 'offsetMinutes' | 'updatedAt'>;

export type BudgetPlan = {
  /** The window of each scheduled reminder: 1 for a clock reminder, the number of fire dates for a prayer one. */
  windows: Map<string, number>;
  /** Enabled reminders that have nothing to schedule now: the newest, when the pool is full. */
  unscheduled: string[];
};

/** Whether a reminder has something to schedule: enabled, with a clock time or a prayer and an offset chosen. */
function isSchedulable(reminder: Planned): boolean {
  if (!reminder.enabled) {
    return false;
  }
  if (reminder.triggerType === 'clock') {
    return clockTrigger(reminder.clockTime) !== null;
  }
  return reminder.prayer !== null && reminder.offsetMinutes !== null;
}

/** Categories before entries, then the oldest update first, then id, so the same input always gives the same plan. */
function planOrder(a: Planned, b: Planned): number {
  if (a.targetType !== b.targetType) {
    return a.targetType === 'category' ? -1 : 1;
  }
  return a.updatedAt - b.updatedAt || a.id.localeCompare(b.id);
}

export function planAzkarBudget(
  reminders: readonly Planned[],
  budget: number = AZKAR_SLOTS,
  rolling: number = AZKAR_ROLLING_DAYS,
): BudgetPlan {
  const ordered = reminders.filter(isSchedulable).sort(planOrder);
  const windows = new Map<string, number>();
  const unscheduled: string[] = [];
  const fullWindow = (reminder: Planned) => (reminder.triggerType === 'clock' ? 1 : rolling);

  const fullCost = ordered.reduce((sum, reminder) => sum + fullWindow(reminder), 0);
  if (fullCost <= budget) {
    for (const reminder of ordered) {
      windows.set(reminder.id, fullWindow(reminder));
    }
    return { windows, unscheduled };
  }

  // Keep the oldest reminders, each with at least one slot. Whatever does not fit is the newest, and stays unscheduled.
  const kept: Planned[] = [];
  for (const reminder of ordered) {
    if (kept.length < budget) {
      kept.push(reminder);
    } else {
      unscheduled.push(reminder.id);
    }
  }

  // The slots left over after one each go to the windows, oldest first, so the newest are shrunk.
  let spare = budget - kept.length;
  for (const reminder of kept) {
    if (reminder.triggerType === 'clock') {
      windows.set(reminder.id, 1);
      continue;
    }
    const grant = Math.min(rolling - 1, spare);
    spare -= grant;
    windows.set(reminder.id, 1 + grant);
  }

  return { windows, unscheduled };
}

/**
 * Whether saving `input` leaves it scheduled. The other reminders keep their place in the plan; the edited one is the
 * newest, so it is the one that gives way when the pool is full.
 */
export function canScheduleAzkarReminder(input: AzkarReminderInput, store?: RemindersStore): boolean {
  const id = `${input.targetType}:${input.targetKey}`;
  const updatedAt = store?.now?.() ?? Date.now();
  const others = listReminders(store).filter(
    (reminder) => !(reminder.targetType === input.targetType && reminder.targetKey === input.targetKey),
  );
  const candidate: Planned = { id, updatedAt, ...input };
  return !planAzkarBudget([...others, candidate]).unscheduled.includes(id);
}
