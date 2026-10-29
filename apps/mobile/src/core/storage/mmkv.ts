import { createMMKV } from 'react-native-mmkv';

// Preferences read on the cold-start path, before the database opens.
// MMKV is a native module, so the app runs in a dev build rather than Expo Go.
export const storage = createMMKV({ id: 'quran-prefs' });

export const storageKeys = {
  locale: 'locale',
  directionReloadPending: 'directionReloadPending',
  selectedResourceIds: 'content.selectedResourceIds',
  contentLastSyncAt: 'content.lastSyncAt',
  appearance: 'appearance',
  darkAfterMaghrib: 'darkAfterMaghrib',
  readerLastVerseKey: 'reader.lastVerseKey',
  readerLastPage: 'reader.lastPage',
  readerMode: 'reader.mode',
  readerSettings: 'reader.settings',
  searchRecentQueries: 'search.recentQueries',
  audioReciterId: 'audio.reciterId',
} as const;

/** Per-page QCF V2 font cache metadata (ADR 0011). */
export const qcfV2FontKeys = {
  etag: (page: number) => `qcf-v2.p${page}.etag`,
  lastModified: (page: number) => `qcf-v2.p${page}.lastModified`,
  revalidatedAt: (page: number) => `qcf-v2.p${page}.revalidatedAt`,
} as const;
