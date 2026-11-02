import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { recordSibhaTap } from '@/features/sibha/data/store';
import { readWidgetSnapshot, writeWidgetSnapshot } from '../snapshot/store';

import { requestAndroidWidgetUpdates } from './update';
import { widgetScheme } from './scheme';
import { handleWidgetTask, type WidgetTaskDeps } from './task-handler';

/**
 * The production dependencies: the same MMKV stores the app uses, so a tap in a widget and a tap in the app land in one
 * counter and one today's total.
 */
function productionDeps(): WidgetTaskDeps {
  const scheme = widgetScheme();
  return {
    now: () => new Date(),
    readSnapshot: readWidgetSnapshot,
    recordMisbahaTap: (now) => {
      const result = recordSibhaTap(now);
      return { count: result.state.count, target: result.state.target, todayTotal: result.todayTotal };
    },
    refreshOthers: (except) => requestAndroidWidgetUpdates({ except }),
    scheme,
    writeSnapshot: writeWidgetSnapshot,
  };
}

/**
 * Registers the headless task that draws the widgets and counts the misbaha «+» with the app closed. It must run while
 * the JavaScript bundle loads, before the app starts: `index.ts` calls it at module load. iOS has no Android widget task;
 * its widgets come with the iOS targets (prompt 16), so the call does nothing there.
 */
export function registerWidgetTasks(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  registerWidgetTaskHandler((props) => handleWidgetTask(props, productionDeps()));
}
