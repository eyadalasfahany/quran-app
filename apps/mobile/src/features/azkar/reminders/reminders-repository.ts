import { randomUUID } from 'expo-crypto';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { openUserDb } from '@/core/db/user/open';

import type { ReminderPrayer } from './schedule';

/**
 * Azkar reminder preferences in `user.db.azkar_reminders` (ADR 0031 §7). Local only: the table has no sync columns and
 * no outbox, and «مسح البيانات» clears it. One row per target (a session category or a single entry).
 */

export type ReminderTargetType = 'category' | 'entry' | 'my_dua';
export type ReminderTriggerType = 'clock' | 'prayer_relative';

export type AzkarReminder = {
  id: string;
  targetType: ReminderTargetType;
  targetKey: string;
  enabled: boolean;
  triggerType: ReminderTriggerType;
  /** `HH:mm`, for a clock reminder. Null until the user picks a time: no time is ever recommended. */
  clockTime: string | null;
  /** The prayer, for a prayer-relative reminder. Null until the user picks one. */
  prayer: ReminderPrayer | null;
  offsetMinutes: number | null;
  /** The ids of the notifications scheduled for this reminder by the last sync. */
  notificationIds: string[];
  updatedAt: number;
};

/** What the user chose. Notification ids are not part of an edit: the sync owns them. */
export type AzkarReminderInput = {
  targetType: ReminderTargetType;
  targetKey: string;
  enabled: boolean;
  triggerType: ReminderTriggerType;
  clockTime: string | null;
  prayer: ReminderPrayer | null;
  offsetMinutes: number | null;
};

export type RemindersStore = {
  db: SqlExecutor;
  now?: () => number;
  uuid?: () => string;
};

/** The raw row as SQL returns it (camel-cased aliases, `enabled` as 0 or 1, `notification_ids` as JSON text). */
export type AzkarReminderRow = {
  id: string;
  targetType: string;
  targetKey: string;
  enabled: number;
  triggerType: string;
  clockTime: string | null;
  prayer: string | null;
  offsetMinutes: number | null;
  notificationIds: string | null;
  updatedAt: number;
};

const SELECT = `
  SELECT
    id,
    target_type AS targetType,
    target_key AS targetKey,
    enabled,
    trigger_type AS triggerType,
    clock_time AS clockTime,
    prayer,
    offset_minutes AS offsetMinutes,
    notification_ids AS notificationIds,
    updated_at AS updatedAt
  FROM azkar_reminders
`;

function resolveStore(store?: RemindersStore): { db: SqlExecutor; now: () => number; uuid: () => string } {
  return {
    db: store?.db ?? openUserDb().executor,
    now: store?.now ?? Date.now,
    uuid: store?.uuid ?? randomUUID,
  };
}

function parseNotificationIds(raw: string | null): string[] {
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Maps a stored row to the domain shape. Unknown codes throw, like the other Azkar readers. */
export function rowToReminder(row: AzkarReminderRow): AzkarReminder {
  if (row.targetType !== 'category' && row.targetType !== 'entry' && row.targetType !== 'my_dua') {
    throw new Error(`Unknown azkar reminder target "${row.targetType}".`);
  }
  if (row.triggerType !== 'clock' && row.triggerType !== 'prayer_relative') {
    throw new Error(`Unknown azkar reminder trigger "${row.triggerType}".`);
  }
  return {
    id: row.id,
    targetType: row.targetType,
    targetKey: row.targetKey,
    enabled: row.enabled === 1,
    triggerType: row.triggerType,
    clockTime: row.clockTime,
    prayer: row.prayer as ReminderPrayer | null,
    offsetMinutes: row.offsetMinutes,
    notificationIds: parseNotificationIds(row.notificationIds),
    updatedAt: row.updatedAt,
  };
}

export function getReminder(targetType: ReminderTargetType, targetKey: string, store?: RemindersStore): AzkarReminder | null {
  const { db } = resolveStore(store);
  const row = db.get<AzkarReminderRow>(`${SELECT} WHERE target_type = ? AND target_key = ?`, [targetType, targetKey]);
  return row === undefined ? null : rowToReminder(row);
}

/** Every reminder, categories first, in a stable order. */
export function listReminders(store?: RemindersStore): AzkarReminder[] {
  const { db } = resolveStore(store);
  return db
    .all<AzkarReminderRow>(`${SELECT} ORDER BY target_type, target_key`)
    .map(rowToReminder);
}

/** Saves the user's choice for a target: inserts the row, or updates it in place (upsert by target). */
export function saveReminder(input: AzkarReminderInput, store?: RemindersStore): AzkarReminder {
  const { db, now, uuid } = resolveStore(store);
  db.run(
    `INSERT INTO azkar_reminders
       (id, target_type, target_key, enabled, trigger_type, clock_time, prayer, offset_minutes, notification_ids, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
     ON CONFLICT (target_type, target_key) DO UPDATE SET
       enabled = excluded.enabled,
       trigger_type = excluded.trigger_type,
       clock_time = excluded.clock_time,
       prayer = excluded.prayer,
       offset_minutes = excluded.offset_minutes,
       updated_at = excluded.updated_at`,
    [
      uuid(),
      input.targetType,
      input.targetKey,
      input.enabled ? 1 : 0,
      input.triggerType,
      input.clockTime,
      input.prayer,
      input.offsetMinutes,
      now(),
    ],
  );
  const saved = getReminder(input.targetType, input.targetKey, { db, now, uuid });
  if (saved === null) {
    throw new Error('The azkar reminder was not saved.');
  }
  return saved;
}

/** Records the notifications the last sync scheduled for a reminder. An empty list means none are pending. */
export function setNotificationIds(id: string, ids: readonly string[], store?: RemindersStore): void {
  const { db } = resolveStore(store);
  db.run('UPDATE azkar_reminders SET notification_ids = ? WHERE id = ?', [ids.length === 0 ? null : JSON.stringify(ids), id]);
}

export function deleteReminder(id: string, store?: RemindersStore): void {
  const { db } = resolveStore(store);
  db.run('DELETE FROM azkar_reminders WHERE id = ?', [id]);
}

export function deleteReminderForTarget(targetType: ReminderTargetType, targetKey: string, store?: RemindersStore): void {
  const { db } = resolveStore(store);
  db.run('DELETE FROM azkar_reminders WHERE target_type = ? AND target_key = ?', [targetType, targetKey]);
}
