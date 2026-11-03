/** Bridges appearance saves to the debounced widget rebuild without importing the sync component from core theme. */

let scheduleRebuild: (() => void) | null = null;

/** Called from `WidgetSnapshotSync` on mount. */
export function registerWidgetSyncSchedule(schedule: () => void): () => void {
  scheduleRebuild = schedule;
  return () => {
    if (scheduleRebuild === schedule) {
      scheduleRebuild = null;
    }
  };
}

/** Schedules `syncWidgets()` after appearance or dark-after-Maghrib changes. */
export function scheduleWidgetSync(): void {
  scheduleRebuild?.();
}
