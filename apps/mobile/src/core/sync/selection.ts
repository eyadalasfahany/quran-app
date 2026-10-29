import type { ContentManifestResource } from '@quran/api-contract';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { readReaderResourceOverride } from '@/features/reader/settings-model';

// Saved selection, else the default. A tafsir installs only when the reader picks one (ADR 0019).
export function selectedResourceIds(resources: readonly ContentManifestResource[]): number[] {
  const saved = readSavedSelection();
  const base = saved ?? defaultSelectedResourceIds(resources);
  return applyReaderResourceOverride(base, resources);
}

export function readSavedSelectionIds(): number[] | undefined {
  return readSavedSelection();
}

export function writeSavedSelectionIds(ids: readonly number[]): void {
  storage.set(storageKeys.selectedResourceIds, JSON.stringify([...ids]));
}

// Every mushaf and the first recitation. Recitations stay as they are until Phase 3.
export function defaultSelectedResourceIds(resources: readonly ContentManifestResource[]): number[] {
  const ids = resources.filter((resource) => resource.group === 'mushafs').map((resource) => resource.id);
  const recitation = resources.find((resource) => resource.group === 'chapter_recitations');
  if (recitation !== undefined) {
    ids.push(recitation.id);
  }
  return ids;
}

function applyReaderResourceOverride(
  base: readonly number[],
  resources: readonly ContentManifestResource[],
): number[] {
  const override = readReaderResourceOverride();
  if (!override.tafsirChosen) {
    return [...base];
  }

  const tafsirs = new Set(resources.filter((resource) => resource.group === 'tafsirs').map((resource) => resource.id));
  const next = base.filter((id) => !tafsirs.has(id));
  if (override.tafsirId !== null && !next.includes(override.tafsirId)) {
    next.push(override.tafsirId);
  }

  return next;
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
