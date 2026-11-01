import { storage, storageKeys } from '../../../core/storage/mmkv';
import type { NextPrayerName } from './prayer-times';

const bellKey: Record<NextPrayerName, string> = {
  fajr: storageKeys.salah.bellFajr,
  dhuhr: storageKeys.salah.bellDhuhr,
  asr: storageKeys.salah.bellAsr,
  maghrib: storageKeys.salah.bellMaghrib,
  isha: storageKeys.salah.bellIsha,
};

/** The prayers that have a bell: the five obligatory ones. الشروق is a marker and has none. */
export const BELL_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const satisfies readonly NextPrayerName[];

/** The MMKV key of a prayer's bell, so a subscriber can re-read it when it changes. */
export const bellStorageKey = (name: NextPrayerName): string => bellKey[name];

// Bells default to off: a reminder is never armed until the user asks for it.
export const getBellEnabled = (name: NextPrayerName): boolean => storage.getBoolean(bellKey[name]) ?? false;

export const setBellEnabled = (name: NextPrayerName, enabled: boolean): void => {
  storage.set(bellKey[name], enabled);
};
