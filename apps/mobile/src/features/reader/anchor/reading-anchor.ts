import { storage, storageKeys } from '@/core/storage/mmkv';

export const READER_MODES = ['mushaf', 'reading', 'focus'] as const;

export type ReaderMode = (typeof READER_MODES)[number];

export type ReadingPosition = {
  verseKey: string;
  page: number | null;
  mode: ReaderMode;
};

export const DEFAULT_VERSE_KEY = '1:1';
export const DEFAULT_PAGE = 1;
export const DEFAULT_READER_MODE: ReaderMode = 'reading';
export const READING_ANCHOR_WRITE_MS = 1000;

export function resolveInitialAnchor(params: { verseKey?: string | null } = {}): ReadingPosition {
  const stored = readStoredAnchor();
  const routeKey = parseRouteVerseKey(params.verseKey);
  if (routeKey !== undefined) {
    return {
      verseKey: routeKey,
      page: null,
      mode: stored?.mode ?? DEFAULT_READER_MODE,
    };
  }
  if (stored !== undefined) {
    return stored;
  }
  return {
    verseKey: DEFAULT_VERSE_KEY,
    page: DEFAULT_PAGE,
    mode: DEFAULT_READER_MODE,
  };
}

/** The ayah being played. Listening owns the continue-reading place, and the saved mode stays as it was. */
export function writePlayedPlace(verseKey: string, page: number | null): void {
  writeReadingAnchor({
    mode: readStoredAnchor()?.mode ?? DEFAULT_READER_MODE,
    page,
    verseKey,
  });
}

export function writeReadingAnchor(position: ReadingPosition): void {
  storage.set(storageKeys.readerLastVerseKey, position.verseKey);
  if (position.page === null) {
    storage.remove(storageKeys.readerLastPage);
  } else {
    storage.set(storageKeys.readerLastPage, String(position.page));
  }
  storage.set(storageKeys.readerMode, position.mode);
}

function readStoredAnchor(): ReadingPosition | undefined {
  const verseKey = storage.getString(storageKeys.readerLastVerseKey);
  if (verseKey === undefined || verseKey.length === 0) {
    return undefined;
  }
  return {
    verseKey,
    page: parsePage(storage.getString(storageKeys.readerLastPage)),
    mode: parseMode(storage.getString(storageKeys.readerMode)),
  };
}

function parseRouteVerseKey(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!/^[1-9]\d*:[1-9]\d*$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function parsePage(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

function parseMode(value: string | undefined): ReaderMode {
  if (value === 'mushaf' || value === 'reading' || value === 'focus') {
    return value;
  }
  return DEFAULT_READER_MODE;
}
