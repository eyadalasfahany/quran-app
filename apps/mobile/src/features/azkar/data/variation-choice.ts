import { storage, storageKeys } from '@/core/storage/mmkv';

/** The reader's chosen alternative per entry key, as a JSON map in MMKV. Personal and local only. */
export type VariationChoices = Record<string, string>;

/** Reads the saved map. A missing, corrupt or non-object value reads as no choices. */
export function getVariationChoices(): VariationChoices {
  try {
    const raw = storage.getString(storageKeys.azkar.variationChoice);
    if (raw === undefined) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const choices: VariationChoices = {};
    for (const [entryKey, variationKey] of Object.entries(parsed)) {
      if (typeof variationKey === 'string') {
        choices[entryKey] = variationKey;
      }
    }
    return choices;
  } catch {
    return {};
  }
}

/** Saves one entry's alternative and returns the whole map. A storage failure leaves the saved map unchanged. */
export function setVariationChoice(entryKey: string, variationKey: string): VariationChoices {
  const next = { ...getVariationChoices(), [entryKey]: variationKey };
  try {
    storage.set(storageKeys.azkar.variationChoice, JSON.stringify(next));
  } catch {
    // Storage can be unavailable; the caller keeps the choice in memory for this session.
  }
  return next;
}
