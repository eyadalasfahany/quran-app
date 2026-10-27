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
} as const;
