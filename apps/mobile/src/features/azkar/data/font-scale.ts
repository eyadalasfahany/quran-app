import { storage, storageKeys } from '@/core/storage/mmkv';
import { clampFontScale, FONT_SCALE_STEP } from '@/features/reader/settings-model';

/**
 * The Azkar text size. It uses the reader's stepper range and step (`settings-model`), so both screens move
 * through the same values. It multiplies the `dhikr` type token.
 */
export const AZKAR_FONT_SCALE_DEFAULT = 1;

export function readAzkarFontScale(): number {
  try {
    return clampFontScale(storage.getNumber(storageKeys.azkar.fontScale));
  } catch {
    return AZKAR_FONT_SCALE_DEFAULT;
  }
}

/** Clamps and saves the scale. Returns the value stored. */
export function saveAzkarFontScale(value: number): number {
  const clamped = clampFontScale(value);
  try {
    storage.set(storageKeys.azkar.fontScale, clamped);
  } catch {
    // Storage can be unavailable; the in-memory value still applies for this session.
  }
  return clamped;
}

/** One step larger (+1) or smaller (-1), clamped to the reader's range. */
export function stepAzkarFontScale(current: number, direction: 1 | -1): number {
  return clampFontScale(Math.round((current + direction * FONT_SCALE_STEP) * 10) / 10);
}
