import { useEffect } from 'react';
import { AppState } from 'react-native';

import { resyncGoalReminders, resyncGoalRemindersIfNeeded } from '../data/goal-sync';

/**
 * Keeps the Friday and misbaha reminders in step (ADR 0034). Mounted once at the root: a full re-plan on launch (once
 * `enabled`, after the databases are open), and on each return to the foreground a re-plan only when the day, the time zone
 * or the location moved. Edits re-plan themselves, in the hub.
 */
export function useReminderGoalsSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    void resyncGoalReminders();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void resyncGoalRemindersIfNeeded();
      }
    });
    return () => subscription.remove();
  }, [enabled]);
}
