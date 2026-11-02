import Constants from 'expo-constants';

import {
  getAppGroupStoreModule,
  WIDGET_SNAPSHOT_USER_DEFAULTS_KEY,
} from 'app-group-store';

import type { WidgetSnapshotWriter } from '../snapshot/publish';

/** `group.<bundle id>` for the running variant (`app.config.ts`). */
export function iosAppGroupSuiteName(): string {
  const bundleId = Constants.expoConfig?.ios?.bundleIdentifier;
  if (typeof bundleId !== 'string' || bundleId.length === 0) {
    throw new Error('iosAppGroupSuiteName requires ios.bundleIdentifier in the Expo config.');
  }
  return `group.${bundleId}`;
}

/** True when the App Group native module is present (iOS dev/release build, not Expo Go without the module). */
export function isIosAppGroupStoreAvailable(): boolean {
  const native = getAppGroupStoreModule();
  if (native === null) {
    return false;
  }
  try {
    return native.isAvailable(iosAppGroupSuiteName());
  } catch {
    return false;
  }
}

/**
 * Writes the snapshot JSON to the App Group (`taybah.snapshot`) and reloads WidgetKit (ADR 0035 §4, prompt 16).
 * No-op when the module is absent.
 */
export async function writeIosWidgetSnapshot(json: string): Promise<void> {
  const native = getAppGroupStoreModule();
  if (native === null) {
    return;
  }
  const suite = iosAppGroupSuiteName();
  await native.write(suite, json);
}

export async function reloadIosWidgets(): Promise<void> {
  const native = getAppGroupStoreModule();
  if (native === null) {
    return;
  }
  await native.reloadWidgets();
}

/** The iOS App Group writer for `publishWidgetSnapshot`. */
export const iosAppGroupWidgetWriter: WidgetSnapshotWriter = {
  id: 'ios-app-group',
  refresh: () => reloadIosWidgets(),
  write: (json) => writeIosWidgetSnapshot(json),
};

export { WIDGET_SNAPSHOT_USER_DEFAULTS_KEY };
