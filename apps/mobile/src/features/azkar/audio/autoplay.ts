import { storage, storageKeys } from '@/core/storage/mmkv';

/** The «تشغيل تلقائي» preference: when a unit's audio ends, the reader advances. Off by default. */
export function readAzkarAutoplay(): boolean {
  try {
    return storage.getBoolean(storageKeys.azkar.audioAutoplay) ?? false;
  } catch {
    return false;
  }
}

/** Saves the preference. Returns the value stored. Storage can be unavailable; the session value still applies. */
export function saveAzkarAutoplay(value: boolean): boolean {
  try {
    storage.set(storageKeys.azkar.audioAutoplay, value);
  } catch {
    // Storage unavailable: the in-memory value still applies for this session.
  }
  return value;
}
