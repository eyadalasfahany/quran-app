import { storage, storageKeys } from '@/core/storage/mmkv';

import { READER_MODES, type ReaderMode } from './anchor/reading-anchor';

export const READER_SETTINGS_VERSION = 1;
export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.1;

export type ReaderSettings = {
  mode: ReaderMode;
  fontScale: number;
  showTranslations: boolean;
  translationIds: number[];
  tafsirId: number | null;
};

export type ReaderChoice = {
  translationsChosen: boolean;
  translationIds: number[];
  tafsirChosen: boolean;
  tafsirId: number | null;
};

export type LoadedReaderSettings = ReaderSettings & ReaderChoice;

export type ReaderResourceOverride = {
  translationIds: number[] | null;
  tafsirChosen: boolean;
  tafsirId: number | null;
};

type PersistedReaderSettings = {
  version?: unknown;
  mode?: unknown;
  fontScale?: unknown;
  showTranslations?: unknown;
  translationIds?: unknown;
  tafsirChosen?: unknown;
  tafsirId?: unknown;
};

export function defaultReaderSettings(): LoadedReaderSettings {
  return {
    mode: 'reading',
    fontScale: 1,
    showTranslations: true,
    translationIds: [],
    tafsirId: null,
    translationsChosen: false,
    tafsirChosen: false,
  };
}

export function clampFontScale(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 1;
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, numeric));
  const steps = Math.round((clamped - FONT_SCALE_MIN) / FONT_SCALE_STEP);
  const snapped = FONT_SCALE_MIN + steps * FONT_SCALE_STEP;
  return Math.round(snapped * 10) / 10;
}

export function migrateReaderSettings(raw: unknown): LoadedReaderSettings {
  const defaults = defaultReaderSettings();
  if (raw === null || typeof raw !== 'object') {
    return defaults;
  }

  const blob = raw as PersistedReaderSettings;
  const translationIds = integerList(blob.translationIds);
  const tafsirChosen = blob.tafsirChosen === true;
  const tafsirId = tafsirChosen ? integerOrNull(blob.tafsirId) : null;

  return {
    mode: isReaderMode(blob.mode) ? blob.mode : defaults.mode,
    fontScale: clampFontScale(blob.fontScale),
    showTranslations: typeof blob.showTranslations === 'boolean' ? blob.showTranslations : defaults.showTranslations,
    translationIds: translationIds ?? [],
    translationsChosen: translationIds !== null,
    tafsirChosen,
    tafsirId,
  };
}

export function readReaderSettings(): LoadedReaderSettings {
  const raw = storage.getString(storageKeys.readerSettings);
  if (raw === undefined) {
    return defaultReaderSettings();
  }
  try {
    return migrateReaderSettings(JSON.parse(raw) as unknown);
  } catch {
    return defaultReaderSettings();
  }
}

export function readReaderResourceOverride(): ReaderResourceOverride {
  const loaded = readReaderSettings();
  return {
    translationIds: loaded.translationsChosen ? loaded.translationIds : null,
    tafsirChosen: loaded.tafsirChosen,
    tafsirId: loaded.tafsirId,
  };
}

export function writeReaderSettings(settings: LoadedReaderSettings): void {
  const blob: PersistedReaderSettings = {
    version: READER_SETTINGS_VERSION,
    mode: settings.mode,
    fontScale: clampFontScale(settings.fontScale),
    showTranslations: settings.showTranslations,
    tafsirChosen: settings.tafsirChosen,
    tafsirId: settings.tafsirId,
  };
  if (settings.translationsChosen) {
    blob.translationIds = settings.translationIds;
  }
  storage.set(storageKeys.readerSettings, JSON.stringify(blob));
}

export function resourceChoiceChanged(previous: ReaderChoice, next: ReaderChoice): boolean {
  return (
    previous.translationsChosen !== next.translationsChosen ||
    previous.tafsirChosen !== next.tafsirChosen ||
    previous.tafsirId !== next.tafsirId ||
    previous.translationIds.length !== next.translationIds.length ||
    previous.translationIds.some((id, index) => id !== next.translationIds[index])
  );
}

function integerList(value: unknown): number[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number' && Number.isInteger(item))) {
    return null;
  }
  return value;
}

function integerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function isReaderMode(value: unknown): value is ReaderMode {
  return typeof value === 'string' && (READER_MODES as readonly string[]).includes(value);
}
