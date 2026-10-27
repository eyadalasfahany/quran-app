import type { ContentManifestResource } from '@quran/api-contract';

import { getLocale, type Locale } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';

// Provisional until the Settings and download UI in Phase 2/3 choose resources.
export function selectedResourceIds(resources: readonly ContentManifestResource[]): number[] {
  const saved = readSavedSelection();
  if (saved !== undefined) {
    return saved;
  }
  return defaultSelectedResourceIds(resources, getLocale());
}

export function defaultSelectedResourceIds(
  resources: readonly ContentManifestResource[],
  locale: Locale,
): number[] {
  const ids = resources.filter((resource) => resource.group === 'mushafs').map((resource) => resource.id);
  const translation = firstByLanguage(resources, 'translations', locale);
  if (translation !== undefined) {
    ids.push(translation);
  }
  const tafsir = firstByLanguage(resources, 'tafsirs', locale);
  if (tafsir !== undefined) {
    ids.push(tafsir);
  }
  const recitation = resources.find((resource) => resource.group === 'chapter_recitations');
  if (recitation !== undefined) {
    ids.push(recitation.id);
  }
  return ids;
}

function firstByLanguage(
  resources: readonly ContentManifestResource[],
  group: 'translations' | 'tafsirs',
  locale: Locale,
): number | undefined {
  const inGroup = resources.filter((resource) => resource.group === group);
  const match = inGroup.find((resource) => resource.language_code === locale);
  if (match !== undefined) {
    return match.id;
  }
  if (locale === 'en') {
    return undefined;
  }
  return inGroup.find((resource) => resource.language_code === 'en')?.id;
}

function readSavedSelection(): number[] | undefined {
  const raw = storage.getString(storageKeys.selectedResourceIds);
  if (raw === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'number' && Number.isInteger(item))) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}
