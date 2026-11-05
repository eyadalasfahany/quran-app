import { useSyncExternalStore } from 'react';

import { requestExactAlarmAccess } from '@/features/notifications/permission';

import {
  dismissExactAlarmPrompt,
  isExactAlarmPromptVisible,
  subscribeExactAlarmPrompt,
} from '../data/exact-alarm-prompt';
import { resyncPrayerNotifications } from '../data/notifications';

import { ExactAlarmDialog } from './ExactAlarmDialog';

/** Opens the exact-alarm screen; on grant, re-plans so the pending prayer notifications become exact (as useBell does). */
async function openExactAlarmSettings(): Promise<void> {
  dismissExactAlarmPrompt();
  if (await requestExactAlarmAccess()) {
    await resyncPrayerNotifications();
  }
}

/**
 * Shown once after location approval or a chosen city turns the default prayer bells on (ADR 0064). Android 14+ only:
 * the prompt is raised only when exact alarms are denied there. Mounted at the root, after the splash.
 */
export function DefaultBellsExactAlarmPrompt() {
  const visible = useSyncExternalStore(subscribeExactAlarmPrompt, isExactAlarmPromptVisible);

  return (
    <ExactAlarmDialog
      onClose={dismissExactAlarmPrompt}
      onConfirm={() => void openExactAlarmSettings()}
      visible={visible}
    />
  );
}
