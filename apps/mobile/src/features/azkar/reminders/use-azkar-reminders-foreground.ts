import { useEffect } from 'react';
import { AppState } from 'react-native';

import { resyncAzkarRemindersIfNeeded } from './resync';

/**
 * Re-checks the Azkar reminders each time the app returns to the foreground. The sync runs only when the day, the time
 * zone or the coordinates changed (ADR 0031 §7), which covers a DST change and a moved or re-set location.
 */
export function useAzkarRemindersForeground(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void resyncAzkarRemindersIfNeeded();
      }
    });
    return () => subscription.remove();
  }, [enabled]);
}
