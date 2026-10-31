import { storage, storageKeys } from '../../../core/storage/mmkv';
import type { NextPrayerName } from './prayer-times';

const bellKey: Record<NextPrayerName, string> = {
  fajr: storageKeys.salah.bellFajr,
  dhuhr: storageKeys.salah.bellDhuhr,
  asr: storageKeys.salah.bellAsr,
  maghrib: storageKeys.salah.bellMaghrib,
  isha: storageKeys.salah.bellIsha,
};

// Bells default to off: a reminder is never armed until the user asks for it.
export const getBellEnabled = (name: NextPrayerName): boolean => storage.getBoolean(bellKey[name]) ?? false;

export const setBellEnabled = (name: NextPrayerName, enabled: boolean): void => {
  storage.set(bellKey[name], enabled);
};
