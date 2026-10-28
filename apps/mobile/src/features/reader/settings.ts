import { create } from 'zustand';

import { openContentDb } from '@/core/db/content/open';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { clearManifestEtag } from '@/core/sync/manifest-etag';
import { readSavedSelectionIds, writeSavedSelectionIds } from '@/core/sync/selection';

import type { ReaderMode } from './anchor/reading-anchor';
import {
  clampFontScale,
  readReaderSettings,
  resourceChoiceChanged,
  writeReaderSettings,
  type LoadedReaderSettings,
  type ReaderChoice,
} from './settings-model';

export type { ReaderSettings } from './settings-model';

type ReaderSettingsStore = LoadedReaderSettings & {
  setMode: (mode: ReaderMode) => void;
  setFontScale: (fontScale: number) => void;
  setTafsirId: (tafsirId: number | null) => void;
};

function choiceOf(settings: LoadedReaderSettings): ReaderChoice {
  return {
    tafsirChosen: settings.tafsirChosen,
    tafsirId: settings.tafsirId,
  };
}

function openExecutor(): SqlExecutor | null {
  try {
    return openContentDb().executor;
  } catch {
    return null;
  }
}

export function rewriteSavedSelection(saved: readonly number[], previous: ReaderChoice, next: ReaderChoice): number[] {
  const drop = new Set<number>();
  if (previous.tafsirChosen && previous.tafsirId !== null) {
    drop.add(previous.tafsirId);
  }

  const ids = saved.filter((id) => !drop.has(id));
  if (next.tafsirChosen && next.tafsirId !== null && !ids.includes(next.tafsirId)) {
    ids.push(next.tafsirId);
  }
  return ids;
}

export function persistResourceChoice(previous: ReaderChoice, next: ReaderChoice, db: SqlExecutor | null): void {
  if (!resourceChoiceChanged(previous, next)) {
    return;
  }
  const saved = readSavedSelectionIds();
  if (saved !== undefined) {
    writeSavedSelectionIds(rewriteSavedSelection(saved, previous, next));
  }
  if (db !== null) {
    clearManifestEtag(db);
  }
}

function commit(current: LoadedReaderSettings, next: LoadedReaderSettings): void {
  const saved = { ...next, fontScale: clampFontScale(next.fontScale) };
  writeReaderSettings(saved);
  if (resourceChoiceChanged(choiceOf(current), choiceOf(saved))) {
    persistResourceChoice(choiceOf(current), choiceOf(saved), openExecutor());
  }
  useReaderSettings.setState(saved);
}

export const useReaderSettings = create<ReaderSettingsStore>(() => ({
  ...readReaderSettings(),
  setMode: (mode) => {
    commit(useReaderSettings.getState(), { ...useReaderSettings.getState(), mode });
  },
  setFontScale: (fontScale) => {
    commit(useReaderSettings.getState(), { ...useReaderSettings.getState(), fontScale });
  },
  setTafsirId: (tafsirId) => {
    const current = useReaderSettings.getState();
    commit(current, { ...current, tafsirId, tafsirChosen: true });
  },
}));

export function resetReaderSettingsStore(): void {
  useReaderSettings.setState(readReaderSettings());
}
