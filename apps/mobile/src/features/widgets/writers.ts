import { androidWidgetWriter } from './android/writer';
import { iosAppGroupWidgetWriter, isIosAppGroupStoreAvailable } from './ios/app-group';
import { mmkvWidgetWriter } from './snapshot/store';
import type { WidgetSnapshotWriter } from './snapshot/publish';

/**
 * The writers for one platform, in order. MMKV is always first, so the canonical copy exists on every platform. The
 * iOS (prompt 16) and Wear OS (prompt 15) writers join this list when their native targets exist.
 */
export function activeWidgetWriters(platform: 'android' | 'ios'): WidgetSnapshotWriter[] {
  if (platform === 'android') {
    return [mmkvWidgetWriter, androidWidgetWriter];
  }
  const writers: WidgetSnapshotWriter[] = [mmkvWidgetWriter];
  if (isIosAppGroupStoreAvailable()) {
    writers.push(iosAppGroupWidgetWriter);
  }
  return writers;
}
