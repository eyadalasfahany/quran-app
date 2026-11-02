import { createMMKV } from 'react-native-mmkv';

// Preferences read on the cold-start path, before the database opens.
// MMKV is a native module, so the app runs in a dev build rather than Expo Go.
export const storage = createMMKV({ id: 'quran-prefs' });

export const storageKeys = {
  onboardingCompleted: 'onboarding.completed',
  locale: 'locale',
  directionReloadPending: 'directionReloadPending',
  selectedResourceIds: 'content.selectedResourceIds',
  contentLastSyncAt: 'content.lastSyncAt',
  appearance: 'appearance',
  darkAfterMaghrib: 'darkAfterMaghrib',
  readerLastVerseKey: 'reader.lastVerseKey',
  readerLastPage: 'reader.lastPage',
  readerMode: 'reader.mode',
  readerMiniCollapsed: 'reader.miniCollapsed',
  readerSettings: 'reader.settings',
  searchRecentQueries: 'search.recentQueries',
  audioReciterId: 'audio.reciterId',
  audioLastPosition: 'audio.lastPosition',
  audioWifiOnlyDownloads: 'audio.wifiOnlyDownloads',
  dailyReminder: 'settings.dailyReminder',
  dailyReminderTime: 'settings.dailyReminderTime',
  dailyReminderNotificationId: 'settings.dailyReminderNotificationId',

  // Azkar preferences (phase 6, step 5). Personal, local only; not cleared by content updates.
  azkar: {
    fontScale: 'azkar.fontScale',
    // JSON map of entry key to the chosen alternative (variation key).
    variationChoice: 'azkar.variationChoice',
    // JSON array of recent Azkar search queries, newest first.
    searchRecent: 'azkar.searchRecent',
    // JSON array of recently opened Azkar scopes, newest first, capped at 10 (ADR 0034 §3).
    recentScopes: 'azkar.recentScopes',
    // JSON: the local day, time zone and coordinates key of the last Azkar reminder sync (ADR 0031 §7).
    remindersSync: 'azkar.remindersSync',
    // Boolean: «تشغيل تلقائي», whether the reader advances when a unit's licensed recording ends (ADR 0031 §8).
    audioAutoplay: 'azkar.audioAutoplay',
  },

  // Misbaha (ADR 0034 §4). Personal, local only; cleared with the other personal data.
  sibha: {
    // JSON: the count, the target and the label.
    state: 'sibha.state',
    // JSON: the local date and the taps counted on it.
    today: 'sibha.today',
  },

  // JSON: the daily goals the user chose (ADR 0034 §5). Nothing is on by default.
  dailyGoals: 'dailyGoals',

  // Salah data layer
  salah: {
    locationSource: 'salah.locationSource',
    manualCityId: 'salah.manualCityId',
    manualLat: 'salah.manualLat',
    manualLng: 'salah.manualLng',
    // Per-prayer reminder toggles (persisted in step 3; scheduling lands in step 4).
    bellFajr: 'salah.bell.fajr',
    bellDhuhr: 'salah.bell.dhuhr',
    bellAsr: 'salah.bell.asr',
    bellMaghrib: 'salah.bell.maghrib',
    bellIsha: 'salah.bell.isha',
    // JSON: the local day, time zone and coordinates key of the last prayer notification sync (ADR 0030 §3).
    notificationsSync: 'salah.notificationsSync',
    // The sound of prayer notifications: a catalogue voice id, 'system' or 'silent' (ADR 0047). One setting for all prayers.
    prayerSound: 'salah.prayerSound',
  },
} as const;

/** Per-page QCF V2 font cache metadata (ADR 0011). */
export const qcfV2FontKeys = {
  etag: (page: number) => `qcf-v2.p${page}.etag`,
  lastModified: (page: number) => `qcf-v2.p${page}.lastModified`,
  revalidatedAt: (page: number) => `qcf-v2.p${page}.revalidatedAt`,
} as const;
