import { storage, storageKeys } from '@/core/storage/mmkv';
import { DEFAULT_QURAN_FONT, isQuranFont, type QuranFont } from '@/core/theme';

import { READER_MODES, type ReaderMode } from './anchor/reading-anchor';

export const READER_SETTINGS_VERSION = 1;
export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.1;

export type ReaderSettings = {
  mode: ReaderMode;
  fontScale: number;
  quranFont: QuranFont;
  tafsirId: number | null;
};

export type ReaderChoice = {
  tafsirChosen: boolean;
  tafsirId: number | null;
};

export type LoadedReaderSettings = ReaderSettings & ReaderChoice;

export type ReaderResourceOverride = {
  tafsirChosen: boolean;
  tafsirId: number | null;
};

// `translationIds` was removed by ADR 0014. Blobs written before that still carry it; it is ignored on read
// and dropped on the next write.
type PersistedReaderSettings = {
  version?: unknown;
  mode?: unknown;
  fontScale?: unknown;
  quranFont?: unknown;
  tafsirChosen?: unknown;
  tafsirId?: unknown;
};

export function defaultReaderSettings(): LoadedReaderSettings {
  return {
    mode: 'reading',
    fontScale: 1,
    quranFont: DEFAULT_QURAN_FONT,
    tafsirId: null,
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
  const tafsirChosen = blob.tafsirChosen === true;
  const tafsirId = tafsirChosen ? integerOrNull(blob.tafsirId) : null;

  return {
    mode: isReaderMode(blob.mode) ? blob.mode : defaults.mode,
    fontScale: clampFontScale(blob.fontScale),
    // Added by ADR 0048 without a version bump: an older blob, or a value no longer offered, reads the default.
    quranFont: isQuranFont(blob.quranFont) ? blob.quranFont : defaults.quranFont,
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
    tafsirChosen: loaded.tafsirChosen,
    tafsirId: loaded.tafsirId,
  };
}

export function writeReaderSettings(settings: LoadedReaderSettings): void {
  const blob: PersistedReaderSettings = {
    version: READER_SETTINGS_VERSION,
    mode: settings.mode,
    fontScale: clampFontScale(settings.fontScale),
    quranFont: settings.quranFont,
    tafsirChosen: settings.tafsirChosen,
    tafsirId: settings.tafsirId,
  };
  storage.set(storageKeys.readerSettings, JSON.stringify(blob));
}

export function resourceChoiceChanged(previous: ReaderChoice, next: ReaderChoice): boolean {
  return previous.tafsirChosen !== next.tafsirChosen || previous.tafsirId !== next.tafsirId;
}

function integerOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function isReaderMode(value: unknown): value is ReaderMode {
  return typeof value === 'string' && (READER_MODES as readonly string[]).includes(value);
}
